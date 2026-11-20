import * as strings from 'AdventCalendarWebPartStrings';
import { AddFieldOptions } from '@pnp/sp/fields';
import { ISPQueryable } from '@pnp/sp';
import { ILocalizedText, localize } from '../models/ILocalizedText';
import { Nullable } from '../models/spTypes';
import { ALL_LISTS, IFieldDefinition, IListDefinition } from '../models/listDefinitions';
import { format, getErrorMessage } from './format';
import { UiLanguage } from './locale';
import { getResourceValue, isNotFound, ListResolver, setResourceValue, SPFI, UserResourceName } from './pnp';

export type ProvisioningState =
  /** Listes et colonnes conformes. */
  | 'ready'
  /** Des éléments manquants ont été créés. */
  | 'repaired'
  /** Des éléments manquent et l'utilisateur n'a pas les droits pour les créer. */
  | 'blocked';

export interface IProvisioningResult {
  state: ProvisioningState;
  missingLists: string[];
  missingFields: string[];
  /** Ajustements non bloquants qui ont échoué (index, unicité, formule de validation). */
  warnings: string[];
}

interface IFieldState {
  Id: string;
  InternalName: string;
  /** Title as SharePoint resolves it for the current user (translated or renamed). */
  Title: string;
  Indexed: boolean;
  EnforceUniqueValues: boolean;
  ValidationFormula: Nullable<string>;
  Required: boolean;
}

interface IListSecurityState {
  ReadSecurity: number;
  WriteSecurity: number;
  HasUniqueRoleAssignments: boolean;
  EnableAttachments: boolean;
  /** Des principaux (hors Contrôle total) ont encore un niveau Modification ou Création sur la liste. */
  hasElevatedPrincipals: boolean;
}

interface IListInspection {
  definition: IListDefinition;
  exists: boolean;
  fields: Map<string, IFieldState>;
  /** Réglages de droits des listes « ownItemsOnly » (undefined si non lisibles). */
  security?: IListSecurityState;
}

interface IRoleAssignmentInfo {
  PrincipalId: number;
  RoleDefinitionBindings: Array<{ Id: number; RoleTypeKind: number }>;
}

/** SP.RoleType : lecture seule ou accès limité (sans droit d'écriture). */
const READER_ROLE_KIND = 2;
const READ_ONLY_ROLE_KINDS = [1, READER_ROLE_KIND];
const CONTRIBUTOR_ROLE_KIND = 3;
/** Création (WebDesigner) et Modification (Editor) : ces niveaux donnent « Gérer les listes ». */
const WEB_DESIGNER_ROLE_KIND = 4;
const ADMINISTRATOR_ROLE_KIND = 5;
const EDITOR_ROLE_KIND = 6;
const ELEVATED_ROLE_KINDS = [WEB_DESIGNER_ROLE_KIND, EDITOR_ROLE_KIND];
/** ReadSecurity / WriteSecurity = 2 : uniquement les éléments créés par l'utilisateur. */
const OWN_ITEMS_ONLY = 2;

// Versionnée avec le schéma : une nouvelle version force une vérification complète.
// v4 : colonnes du sapin dans AdventSettings (2.0).
// v5 : droits de la liste des consultations (niveaux élevés retirés, pièces jointes désactivées).
// v6: multilingual titles (fr-FR / en-US) of the lists, columns and content types.
const SESSION_CACHE_PREFIX = 'adv-calendar-provisioned-v6:';

/**
 * Translation pass done for this site in this browser (localStorage): it reads about 170 resources, so it is not
 * repeated at every session. The value is a signature of the column ids: a list or a column created again (new id),
 * by anyone, triggers a new pass. Bump the version when titles change in listDefinitions.ts.
 */
const LOCALIZED_MARKER_PREFIX = 'adv-calendar-localized-v1:';

/** UI cultures that receive a translation: the two languages of the interface. */
const TRANSLATED_CULTURES: Array<{ culture: string; language: UiLanguage }> = [
  { culture: 'fr-FR', language: 'fr' },
  { culture: 'en-US', language: 'en' }
];

/** SharePoint's own titles of the built-in Title column (lists created by ProvisioningService). */
const BUILT_IN_TITLE_FIELD_TITLES = ['Title', 'Titre'];

/** One multilingual resource (list title, column title, content type name…) to translate. */
interface IResourceTarget {
  /** Label used in warnings. */
  label: string;
  owner: (sp: SPFI) => ISPQueryable;
  resource: UserResourceName;
  text: ILocalizedText;
  /**
   * Values that may be replaced: creation values and known defaults. Any other value was typed by an
   * administrator and is never overwritten.
   */
  replaceable: string[];
}

interface ITranslation {
  target: IResourceTarget;
  culture: string;
  value: string;
}

type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

function settle<T>(promise: Promise<T>): Promise<Outcome<T>> {
  return promise.then(
    (value): Outcome<T> => ({ ok: true, value }),
    (error: unknown): Outcome<T> => ({ ok: false, error })
  );
}

export interface IProvisioningOptions {
  /** UI language: language of the labels in the results (missing items, warnings). */
  language: UiLanguage;
  /** Default language of the site (`pageContext.web.languageName`, e.g. de-DE). */
  webLanguageName: string;
}

/**
 * Vérifie au chargement l'existence des listes et de leurs colonnes, et crée ce qui manque
 * (liste supprimée, schéma qui a évolué). Complète le provisionnement Feature Framework du package.
 */
export class ProvisioningService {
  public constructor(
    private readonly _sp: SPFI,
    private readonly _lists: ListResolver,
    private readonly _options: IProvisioningOptions
  ) {}

  /**
   * `isSiteOwner`: the titles are translated by site owners only, as site columns and site content types
   * (Site settings) are translated along with the lists.
   */
  public async ensure(canManageLists: boolean, isSiteOwner: boolean = false): Promise<IProvisioningResult> {
    const cacheKey = SESSION_CACHE_PREFIX + this._lists.listUrl(ALL_LISTS[0]);
    if (this._readStorage('session', cacheKey) === '1') {
      return { state: 'ready', missingLists: [], missingFields: [], warnings: [] };
    }

    const inspections = await Promise.all(ALL_LISTS.map((definition) => this._inspect(definition)));
    const missingLists = inspections.filter((inspection) => !inspection.exists).map((inspection) => this._t(inspection.definition.title));
    const missingFields = inspections
      .filter((inspection) => inspection.exists)
      .reduce<string[]>((all, inspection) => all.concat(
        inspection.definition.fields
          .filter((field) => !inspection.fields.has(field.internalName))
          .map((field) => `${this._t(inspection.definition.title)} › ${this._t(field.title)}`)
      ), []);
    // Une liste facultative (consultations) absente ou incomplète ne bloque pas l'application ;
    // une colonne facultative manquante (réglages du sapin, ajoutés en 2.0) non plus : repli sur le modèle « Classique ».
    const isBlocking = inspections.some((inspection) => !inspection.definition.optional
      && (!inspection.exists
        || inspection.definition.fields.some((field) => !field.optional && !inspection.fields.has(field.internalName))));
    const needsFixups = inspections.some((inspection) => inspection.exists
      && (this._pendingFixups(inspection).length > 0 || this._needsItemSecurity(inspection) || this._obsoleteToRelax(inspection).length > 0));

    const hasMissingItems = missingLists.length > 0 || missingFields.length > 0;

    if (!canManageLists) {
      // Les ajustements d'index ou de validation manquants ne bloquent pas la lecture.
      if (!isBlocking) {
        this._writeStorage('session', cacheKey, '1');
      }
      return { state: isBlocking ? 'blocked' : 'ready', missingLists, missingFields, warnings: [] };
    }

    const warnings: string[] = [];
    if (hasMissingItems || needsFixups) {
      for (const inspection of inspections) {
        await this._repair(inspection, warnings);
      }
    }

    // Titles in French and English: once per site and browser, and again whenever a list or a column was created.
    const localizedKey = LOCALIZED_MARKER_PREFIX + this._lists.listUrl(ALL_LISTS[0]);
    const signature = this._schemaSignature(inspections);
    if (isSiteOwner && (hasMissingItems || this._readStorage('local', localizedKey) !== signature)) {
      const translationWarnings = await this._localize();
      // After a creation, the new column ids are only known at the next inspection: no marker this time.
      if (translationWarnings.length === 0 && !hasMissingItems) {
        this._writeStorage('local', localizedKey, signature);
      }
      warnings.push(...translationWarnings);
    }

    if (warnings.length === 0) {
      this._writeStorage('session', cacheKey, '1');
    }
    return {
      state: hasMissingItems ? 'repaired' : 'ready',
      missingLists,
      missingFields,
      warnings
    };
  }

  private async _inspect(definition: IListDefinition): Promise<IListInspection> {
    const names = definition.fields.map((field) => field.internalName).concat(definition.obsoleteFields ?? []);
    const filter = names.map((name) => `InternalName eq '${name}'`).join(' or ');
    try {
      const fields = await this._lists.getList(definition).fields
        .select('Id', 'InternalName', 'Title', 'Indexed', 'EnforceUniqueValues', 'ValidationFormula', 'Required')
        .filter(filter)<IFieldState[]>();
      const inspection: IListInspection = { definition, exists: true, fields: new Map(fields.map((field) => [field.InternalName, field])) };
      if (definition.ownItemsOnly) {
        inspection.security = await this._readSecurity(definition);
      }
      return inspection;
    } catch (error) {
      if (isNotFound(error)) {
        return { definition, exists: false, fields: new Map() };
      }
      throw error;
    }
  }

  private _pendingFixups(inspection: IListInspection): IFieldDefinition[] {
    return inspection.definition.fields.filter((field) => {
      const state = inspection.fields.get(field.internalName);
      if (!state) {
        return false;
      }
      return (field.indexed === true && !state.Indexed)
        || (field.unique === true && !state.EnforceUniqueValues)
        // Unicité à retirer (ex. AdvViewKey, créée unique en 1.1.0 : incompatible avec ReadSecurity = 2).
        || (field.unique === false && state.EnforceUniqueValues)
        || (field.validation !== undefined && !state.ValidationFormula);
    });
  }

  /** Une liste facultative qui échoue n'est qu'un avertissement : le calendrier reste utilisable. */
  private async _repair(inspection: IListInspection, warnings: string[]): Promise<void> {
    const definition = inspection.definition;
    try {
      await this._repairList(inspection, warnings);
    } catch (error) {
      if (!definition.optional) {
        throw error;
      }
      warnings.push(`${this._t(definition.title)} : ${getErrorMessage(error)}`);
    }
  }

  private async _repairList(inspection: IListInspection, warnings: string[]): Promise<void> {
    const definition = inspection.definition;
    if (!inspection.exists) {
      await this._createList(definition);
    }

    const list = this._lists.getList(definition);
    const created: IFieldDefinition[] = [];
    for (const field of definition.fields.filter((candidate) => !inspection.fields.has(candidate.internalName))) {
      let options = AddFieldOptions.AddFieldInternalNameHint | AddFieldOptions.AddToAllContentTypes;
      if (!field.technical) {
        options |= AddFieldOptions.AddFieldToDefaultView;
      }
      try {
        await list.fields.createFieldAsXml({ SchemaXml: field.schemaXml, Options: options });
        created.push(field);
      } catch (error) {
        if (!field.optional) {
          throw error;
        }
        warnings.push(`${this._t(definition.title)} › ${this._t(field.title)} : ${getErrorMessage(error)}`);
      }
    }

    // A column created here still has its creation title (French) in every language.
    for (const field of created) {
      await this._applyFixups(definition, field, field.title.fr, warnings);
    }
    for (const field of this._pendingFixups(inspection)) {
      await this._applyFixups(definition, field, inspection.fields.get(field.internalName)?.Title ?? field.title.fr, warnings);
    }

    for (const name of this._obsoleteToRelax(inspection)) {
      try {
        await list.fields.getByInternalNameOrTitle(name).update({ Required: false }, 'SP.Field');
      } catch (error) {
        warnings.push(`${this._t(definition.title)} › ${name} : ${getErrorMessage(error)}`);
      }
    }

    if (definition.ownItemsOnly && (!inspection.exists || this._needsItemSecurity(inspection))) {
      await this._applyItemSecurity(definition, warnings);
    }
  }

  /** Colonnes obsolètes encore obligatoires : à rendre facultatives (les nouvelles lignes ne les alimentent plus). */
  private _obsoleteToRelax(inspection: IListInspection): string[] {
    return (inspection.definition.obsoleteFields ?? []).filter((name) => inspection.fields.get(name)?.Required === true);
  }

  private async _readSecurity(definition: IListDefinition): Promise<IListSecurityState | undefined> {
    const list = this._lists.getList(definition);
    let state: Omit<IListSecurityState, 'hasElevatedPrincipals'>;
    try {
      state = await list.select('ReadSecurity', 'WriteSecurity', 'HasUniqueRoleAssignments', 'EnableAttachments')<
        Omit<IListSecurityState, 'hasElevatedPrincipals'>
      >();
    } catch {
      // Propriétés non lisibles : on ne tente pas de réglage (pas de boucle de réparation).
      return undefined;
    }
    let hasElevatedPrincipals = false;
    try {
      const assignments = await list.roleAssignments
        .select('PrincipalId', 'RoleDefinitionBindings/Id', 'RoleDefinitionBindings/RoleTypeKind')
        .expand('RoleDefinitionBindings')<IRoleAssignmentInfo[]>();
      hasElevatedPrincipals = assignments.some((assignment) => this._isElevated(assignment));
    } catch {
      // Droits non lisibles : on ne déclenche pas de réparation pour ce seul motif.
    }
    return { ...state, hasElevatedPrincipals };
  }

  /** Niveau Création ou Modification sans Contrôle total (les propriétaires ne sont jamais touchés). */
  private _isElevated(assignment: IRoleAssignmentInfo): boolean {
    const kinds = assignment.RoleDefinitionBindings.map((binding) => binding.RoleTypeKind);
    return kinds.some((kind) => ELEVATED_ROLE_KINDS.indexOf(kind) !== -1) && kinds.indexOf(ADMINISTRATOR_ROLE_KIND) === -1;
  }

  private _needsItemSecurity(inspection: IListInspection): boolean {
    const security = inspection.security;
    return !!inspection.definition.ownItemsOnly && !!security
      && (security.ReadSecurity !== OWN_ITEMS_ONLY || security.WriteSecurity !== OWN_ITEMS_ONLY || !security.HasUniqueRoleAssignments
        || security.EnableAttachments === true || security.hasElevatedPrincipals);
  }

  /**
   * Liste des consultations : chacun ne lit et ne modifie que ses éléments, et toute personne
   * qui a accès au site (visiteurs compris) peut en créer. Nécessite le droit « Gérer les autorisations ».
   */
  private async _applyItemSecurity(definition: IListDefinition, warnings: string[]): Promise<void> {
    const list = this._lists.getList(definition);
    try {
      // Pas de pièces jointes : un visiteur (Collaboration) ne doit pas pouvoir déposer de fichiers sur le site.
      await list.update({ ReadSecurity: OWN_ITEMS_ONLY, WriteSecurity: OWN_ITEMS_ONLY, EnableAttachments: false });
    } catch (error) {
      warnings.push(`${this._t(definition.title)} : ${getErrorMessage(error)}`);
    }
    try {
      const info = await list.select('HasUniqueRoleAssignments')<{ HasUniqueRoleAssignments: boolean }>();
      if (!info.HasUniqueRoleAssignments) {
        // Copie des droits du site, puis ajout de la Collaboration à ceux qui n'ont que la lecture.
        await list.breakRoleInheritance(true, false);
      }
      const contributor = await this._sp.web.roleDefinitions.getByType(CONTRIBUTOR_ROLE_KIND).select('Id')<{ Id: number }>();
      const assignments = await list.roleAssignments
        .select('PrincipalId', 'RoleDefinitionBindings/Id', 'RoleDefinitionBindings/RoleTypeKind')
        .expand('RoleDefinitionBindings')<IRoleAssignmentInfo[]>();
      for (const assignment of assignments) {
        let kinds = assignment.RoleDefinitionBindings.map((binding) => binding.RoleTypeKind);
        if (this._isElevated(assignment)) {
          // Modification / Création (« Gérer les listes ») : ramenés à la Collaboration, sans toucher au Contrôle total.
          for (const binding of assignment.RoleDefinitionBindings) {
            if (ELEVATED_ROLE_KINDS.indexOf(binding.RoleTypeKind) !== -1) {
              await list.roleAssignments.remove(assignment.PrincipalId, binding.Id);
            }
          }
          kinds = kinds.filter((kind) => ELEVATED_ROLE_KINDS.indexOf(kind) === -1);
          if (kinds.indexOf(CONTRIBUTOR_ROLE_KIND) === -1) {
            await list.roleAssignments.add(assignment.PrincipalId, contributor.Id);
          }
          continue;
        }
        const isReadOnly = kinds.every((kind) => READ_ONLY_ROLE_KINDS.indexOf(kind) !== -1);
        // Accès limité seul (partage ponctuel d'un élément) : on n'élargit pas.
        const hasRead = kinds.indexOf(READER_ROLE_KIND) !== -1;
        if (isReadOnly && hasRead) {
          await list.roleAssignments.add(assignment.PrincipalId, contributor.Id);
        }
      }
    } catch (error) {
      warnings.push(`${this._t(definition.title)} : ${getErrorMessage(error)}`);
    }
  }

  private async _createList(definition: IListDefinition): Promise<void> {
    // Création avec le nom technique (qui fixe l'URL Lists/<urlName>), puis renommage avec le titre affiché.
    // French = creation value, as in elements.xml; the translations are set afterwards by _localize().
    await this._sp.web.lists.add(definition.urlName, definition.description.fr, 100, false);
    const list = this._lists.getList(definition);
    await list.update({ Title: definition.title.fr });
    await list.fields.getByInternalNameOrTitle('Title').update({
      Title: definition.titleField.fr,
      Required: definition.titleRequired
    }, 'SP.Field');
  }

  /**
   * `currentTitle`: title of the column as SharePoint resolves it for the current user, used in the validation
   * formula (a formula that names the French title fails for a user who sees the column in English).
   */
  private async _applyFixups(definition: IListDefinition, field: IFieldDefinition, currentTitle: string, warnings: string[]): Promise<void> {
    const target = this._lists.getList(definition).fields.getByInternalNameOrTitle(field.internalName);
    if (field.indexed || field.unique) {
      try {
        await target.update({ Indexed: true, EnforceUniqueValues: field.unique === true }, 'SP.Field');
      } catch (error) {
        warnings.push(`${this._t(definition.title)} › ${this._t(field.title)} : ${getErrorMessage(error)}`);
      }
    }
    if (field.validation) {
      try {
        await target.update({ ValidationFormula: field.validation.formula(currentTitle), ValidationMessage: field.validation.message }, 'SP.Field');
      } catch (error) {
        warnings.push(`${this._t(definition.title)} › ${this._t(field.title)} : ${getErrorMessage(error)}`);
      }
    }
  }

  /** Labels returned to the interface (missing items, warnings) are in the UI language. */
  private _t(text: ILocalizedText): string {
    return localize(text, this._options.language);
  }

  /**
   * Multilingual titles (SharePoint MUI): sets the French (fr-FR) and English (en-US) values of the titles of the
   * lists, their columns and content types, and of the site columns and site content types created by the feature,
   * with UserResource.SetValueForUICulture. A value is replaced only while it is still a known default (creation
   * value, French or English title): a title renamed by an administrator is never overwritten.
   * Never blocking: every failure becomes a warning.
   */
  private async _localize(): Promise<string[]> {
    const warnings: string[] = [];
    try {
      const targets = await this._collectTranslationTargets(warnings);
      const cultures = this._translatedCultures();

      const reads = targets.reduce<ITranslation[]>((all, target) => all.concat(
        cultures.map(({ culture, language }) => ({ target, culture, value: localize(target.text, language) }))
      ), []);
      const current = await this._inBatch(reads, (sp, read) => getResourceValue(read.target.owner(sp), read.target.resource, read.culture));

      const writes: ITranslation[] = [];
      reads.forEach((read, index) => {
        const outcome = current[index];
        if (!outcome.ok) {
          if (!isNotFound(outcome.error)) {
            warnings.push(this._translationWarning(read, getErrorMessage(outcome.error)));
          }
          return;
        }
        const replaceable = [read.target.text.fr, read.target.text.en, ''].concat(read.target.replaceable);
        if (outcome.value !== read.value && replaceable.indexOf(outcome.value) !== -1) {
          writes.push(read);
        }
      });
      if (writes.length === 0) {
        return this._capWarnings(warnings);
      }

      const written = await this._inBatch(writes, (sp, write) => setResourceValue(write.target.owner(sp), write.target.resource, write.culture, write.value));
      const toVerify = writes.filter((write, index) => {
        const outcome = written[index];
        if (!outcome.ok) {
          warnings.push(this._translationWarning(write, getErrorMessage(outcome.error)));
        }
        return outcome.ok;
      });

      // Read back: a translation that SharePoint did not keep is reported instead of being assumed.
      const verified = await this._inBatch(toVerify, (sp, write) => getResourceValue(write.target.owner(sp), write.target.resource, write.culture));
      toVerify.forEach((write, index) => {
        const outcome = verified[index];
        if (!outcome.ok || outcome.value !== write.value) {
          warnings.push(this._translationWarning(write, outcome.ok ? strings.ProvisioningTranslationNotSaved : getErrorMessage(outcome.error)));
        }
      });
    } catch (error) {
      warnings.push(format(strings.ProvisioningTranslationError, getErrorMessage(error)));
    }
    return this._capWarnings(warnings);
  }

  /**
   * fr-FR and en-US, plus the default language of the site when it is another one (e.g. de-DE): it receives the
   * English titles, as the interface falls back to English for every language other than French.
   */
  private _translatedCultures(): Array<{ culture: string; language: UiLanguage }> {
    const cultures = TRANSLATED_CULTURES.slice();
    const siteCulture = (this._options.webLanguageName || '').trim();
    if (siteCulture && !cultures.some((entry) => entry.culture.toLowerCase() === siteCulture.toLowerCase())) {
      cultures.push({ culture: siteCulture, language: siteCulture.toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en' });
    }
    return cultures;
  }

  /** Resources to translate, limited to the objects that exist on the site (one batch of reads). */
  private async _collectTranslationTargets(warnings: string[]): Promise<IResourceTarget[]> {
    const siteFields = ALL_LISTS
      .reduce<IFieldDefinition[]>((all, definition) => all.concat(definition.fields), [])
      .filter((field, index, all) => all.findIndex((candidate) => candidate.internalName === field.internalName) === index);
    const byInternalName = (fields: IFieldDefinition[]): string => fields.map((field) => `InternalName eq '${field.internalName}'`).join(' or ');

    const [batched, execute] = this._sp.batched();
    const listFields = ALL_LISTS.map((definition) => settle(
      this._lists.getList(definition, batched).fields.select('InternalName').filter(byInternalName(definition.fields))<Array<{ InternalName: string }>>()
    ));
    const listTypes = ALL_LISTS.map((definition) => settle(
      this._lists.getList(definition, batched).contentTypes.select('StringId')<Array<{ StringId: string }>>()
    ));
    const webFields = settle(batched.web.fields.select('InternalName').filter(byInternalName(siteFields))<Array<{ InternalName: string }>>());
    const webTypes = settle(batched.web.contentTypes.select('StringId')<Array<{ StringId: string }>>());
    await execute();

    const targets: IResourceTarget[] = [];
    for (let index = 0; index < ALL_LISTS.length; index++) {
      const definition = ALL_LISTS[index];
      const fields = await listFields[index];
      if (!fields.ok) {
        // Missing list: already reported by the schema check.
        if (!isNotFound(fields.error)) {
          warnings.push(`${this._t(definition.title)} : ${getErrorMessage(fields.error)}`);
        }
        continue;
      }
      const listTitle = this._t(definition.title);
      const list = (sp: SPFI): ISPQueryable => this._lists.getList(definition, sp);
      targets.push(
        { label: listTitle, owner: list, resource: 'TitleResource', text: definition.title, replaceable: [definition.urlName] },
        { label: listTitle, owner: list, resource: 'DescriptionResource', text: definition.description, replaceable: [] },
        {
          label: `${listTitle} › ${this._t(definition.titleField)}`,
          owner: (sp) => this._lists.getList(definition, sp).fields.getByInternalNameOrTitle('Title'),
          resource: 'TitleResource',
          text: definition.titleField,
          replaceable: BUILT_IN_TITLE_FIELD_TITLES
        }
      );
      const existing = fields.value.map((field) => field.InternalName);
      definition.fields
        .filter((field) => existing.indexOf(field.internalName) !== -1)
        .forEach((field) => targets.push({
          label: `${listTitle} › ${this._t(field.title)}`,
          owner: (sp) => this._lists.getList(definition, sp).fields.getByInternalNameOrTitle(field.internalName),
          resource: 'TitleResource',
          text: field.title,
          replaceable: []
        }));
      // The list copy of a site content type has an id that starts with the site content type id followed by 00.
      const types = await listTypes[index];
      const prefix = `${definition.contentType.id}00`.toUpperCase();
      const listType = types.ok ? types.value.find((type) => type.StringId.toUpperCase().indexOf(prefix) === 0) : undefined;
      if (listType) {
        targets.push({
          label: `${listTitle} › ${this._t(definition.contentType.name)}`,
          owner: (sp) => this._lists.getList(definition, sp).contentTypes.getById(listType.StringId),
          resource: 'NameResource',
          text: definition.contentType.name,
          replaceable: []
        });
      }
    }

    // Site columns and site content types exist only when the feature created the lists.
    const webFieldNames = await webFields;
    if (webFieldNames.ok) {
      const existing = webFieldNames.value.map((field) => field.InternalName);
      siteFields
        .filter((field) => existing.indexOf(field.internalName) !== -1)
        .forEach((field) => targets.push({
          label: this._t(field.title),
          owner: (sp) => sp.web.fields.getByInternalNameOrTitle(field.internalName),
          resource: 'TitleResource',
          text: field.title,
          replaceable: []
        }));
    }
    const webTypeIds = await webTypes;
    if (webTypeIds.ok) {
      const existing = webTypeIds.value.map((type) => type.StringId.toUpperCase());
      ALL_LISTS
        .filter((definition) => existing.indexOf(definition.contentType.id.toUpperCase()) !== -1)
        .forEach((definition) => targets.push({
          label: this._t(definition.contentType.name),
          owner: (sp) => sp.web.contentTypes.getById(definition.contentType.id),
          resource: 'NameResource',
          text: definition.contentType.name,
          replaceable: []
        }));
    }

    // Same title in both languages and nothing else to replace (e.g. "Image", "Logo"): nothing to translate.
    return targets.filter((target) => target.text.fr !== target.text.en || target.replaceable.length > 0);
  }

  /**
   * Runs one request per entry in a single PnPjs batch (sent in chunks of 20 by PnPjs).
   * The outcome of each request is kept: one failure does not fail the others.
   */
  private async _inBatch<TEntry, TResult>(
    entries: TEntry[],
    request: (sp: SPFI, entry: TEntry) => Promise<TResult>
  ): Promise<Array<Outcome<TResult>>> {
    if (entries.length === 0) {
      return [];
    }
    const [batched, execute] = this._sp.batched();
    const pending = entries.map((entry) => settle(request(batched, entry)));
    // Throws when the $batch request itself fails (then caught by _localize).
    await execute();
    return Promise.all(pending);
  }

  private _translationWarning(translation: ITranslation, reason: string): string {
    return format(strings.ProvisioningTranslationFailed, translation.target.label, translation.culture, reason);
  }

  /** Keeps the warning list readable when the same failure repeats on every resource. */
  private _capWarnings(warnings: string[]): string[] {
    const max = 8;
    return warnings.length > max + 1
      ? warnings.slice(0, max).concat(format(strings.ProvisioningMoreWarnings, warnings.length - max))
      : warnings;
  }

  /** `window.*Storage` can throw (blocked site data, private mode): always accessed inside try/catch. */
  /** Signature of the lists and column ids found by the inspection (FNV-1a, 32 bits). */
  private _schemaSignature(inspections: IListInspection[]): string {
    const text = inspections
      .map((inspection) => `${inspection.definition.key}:${Array.from(inspection.fields.values()).map((field) => field.Id).sort().join(',')}`)
      .join('|');
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16);
  }

  private _readStorage(kind: 'session' | 'local', key: string): string | undefined {
    try {
      return (kind === 'session' ? window.sessionStorage : window.localStorage).getItem(key) ?? undefined;
    } catch {
      return undefined;
    }
  }

  private _writeStorage(kind: 'session' | 'local', key: string, value: string): void {
    try {
      (kind === 'session' ? window.sessionStorage : window.localStorage).setItem(key, value);
    } catch {
      // Stockage indisponible : la vérification sera simplement refaite au prochain chargement.
    }
  }
}
