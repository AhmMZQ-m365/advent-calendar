/**
 * Schéma des listes du calendrier, utilisé par ProvisioningService pour vérifier
 * et compléter les listes au chargement.
 * Doit rester aligné avec sharepoint/assets/elements.xml (Feature Framework).
 *
 * Titles: single source of truth for the French and English titles of the lists, columns and content types.
 * French = creation value (elements.xml, createFieldAsXml); both languages are then set as SharePoint
 * multilingual resources (TitleResource / NameResource, fr-FR and en-US) by ProvisioningService.
 */
import { ILocalizedText } from './ILocalizedText';

export type ListKey = 'publications' | 'settings' | 'admins' | 'views';

export interface IFieldValidation {
  /**
   * Builds the formula from the column title as SharePoint resolves it for the current user
   * (the title can be translated or renamed: the creation title is not always valid).
   */
  formula: (columnTitle: string) => string;
  message: string;
}

export interface IFieldDefinition {
  internalName: string;
  /** Column title: `fr` = creation value (DisplayName), `en` = English translation. */
  title: ILocalizedText;
  schemaXml: string;
  indexed?: boolean;
  /** true = valeurs uniques imposées ; false = unicité à retirer si présente ; absent = laissé tel quel. */
  unique?: boolean;
  /** Colonne technique : non ajoutée à l'affichage par défaut. */
  technical?: boolean;
  /** Colonne facultative : son absence est réparée mais ne bloque pas les lecteurs (fonction dégradée). */
  optional?: boolean;
  validation?: IFieldValidation;
}

/** Site content type provisioned by the feature (elements.xml), copied into the list when the list is created. */
export interface IContentTypeDefinition {
  /** Site content type id; the list copy has an id that starts with it. */
  id: string;
  name: ILocalizedText;
}

export interface IListDefinition {
  key: ListKey;
  /** Nom utilisé dans l'URL de la liste (Lists/<urlName>) : identifiant stable. */
  urlName: string;
  title: ILocalizedText;
  description: ILocalizedText;
  /** Title of the built-in Title column in this list. */
  titleField: ILocalizedText;
  titleRequired: boolean;
  contentType: IContentTypeDefinition;
  fields: IFieldDefinition[];
  /** Liste facultative : son absence ne bloque pas l'application (fonction dégradée). */
  optional?: boolean;
  /**
   * Chacun ne voit et ne modifie que ses propres éléments (ReadSecurity / WriteSecurity = 2),
   * et tous les utilisateurs du site peuvent en ajouter (droits posés par ProvisioningService).
   */
  ownItemsOnly?: boolean;
  /**
   * Colonnes d'un ancien schéma, plus alimentées : rendues facultatives si elles existent encore
   * (jamais supprimées, pour ne pas perdre de données).
   */
  obsoleteFields?: string[];
}

/** Site column group (a plain string in SharePoint, not translatable). */
const GROUP = "Calendrier de l'Avent";

function t(fr: string, en: string): ILocalizedText {
  return { fr, en };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fieldXml(
  internalName: string,
  displayName: string,
  type: string,
  attributes: Record<string, string> = {},
  defaultValue?: string
): string {
  const attrs = Object.keys(attributes)
    .map((name) => ` ${name}="${escapeXml(attributes[name])}"`)
    .join('');
  const inner = defaultValue !== undefined ? `<Default>${escapeXml(defaultValue)}</Default>` : '';
  return `<Field Type="${type}" Name="${internalName}" StaticName="${internalName}" DisplayName="${escapeXml(displayName)}" Group="${escapeXml(GROUP)}"${attrs}>${inner}</Field>`;
}

function field(
  internalName: string,
  title: ILocalizedText,
  type: string,
  attributes: Record<string, string> = {},
  defaultValue?: string
): IFieldDefinition {
  return { internalName, title, schemaXml: fieldXml(internalName, title.fr, type, attributes, defaultValue) };
}

/**
 * Les formules de validation SharePoint ne gèrent pas les expressions régulières :
 * cette formule reproduit `^#([0-9A-Fa-f]{6})$` caractère par caractère.
 * Le formulaire d'administration applique en plus la regex exacte côté client.
 * The message is bilingual: SharePoint stores a single validation message per column.
 */
const HEX_COLOR_VALIDATION: IFieldValidation = {
  formula: (columnTitle: string): string => {
    const ref = `[${columnTitle}]`;
    const hexChecks = [2, 3, 4, 5, 6, 7]
      .map((position) => `ISNUMBER(FIND(UPPER(MID(${ref},${position},1)),"0123456789ABCDEF"))`)
      .join(',');
    return `=OR(ISBLANK(${ref}),AND(LEN(${ref})=7,LEFT(${ref},1)="#",${hexChecks}))`;
  },
  message: 'Code couleur au format #RRGGBB (ex. #1B5E3F). / Color code in the #RRGGBB format (e.g. #1B5E3F).'
};

function colorField(internalName: string, title: ILocalizedText): IFieldDefinition {
  return {
    ...field(internalName, title, 'Text', { MaxLength: '7' }),
    validation: HEX_COLOR_VALIDATION
  };
}

/** Shared by the posts and visits lists (same site column). */
const YEAR_TITLE = t('Édition (année)', 'Edition (year)');
/** Shared by the administrators and visits lists. */
const LABEL_TITLE = t('Libellé', 'Label');

export const PUBLICATIONS_LIST: IListDefinition = {
  key: 'publications',
  urlName: 'AdventPublications',
  title: t("Calendrier de l'Avent – Publications", 'Advent Calendar – Posts'),
  description: t("Publications des 24 cases du calendrier de l'Avent", 'Posts of the 24 doors of the Advent calendar'),
  titleField: t('Titre de la publication', 'Post title'),
  titleRequired: true,
  contentType: { id: '0x0100F3CD33B1A8864E02ADE2FD540FF8FAEE', name: t("Publication de l'Avent", 'Advent post') },
  fields: [
    { ...field('AdvDay', t('Jour', 'Day'), 'Number', { Decimals: '0', Min: '1', Max: '24', Required: 'TRUE' }), indexed: true },
    field('AdvUnlockDate', t("Date d'ouverture", 'Opening date'), 'DateTime', { Format: 'DateTime' }),
    field('AdvImage', t('Image', 'Image'), 'URL', { Format: 'Image' }),
    field('AdvBody', t('Contenu', 'Content'), 'Note', { RichText: 'TRUE', RichTextMode: 'FullHtml', IsolateStyles: 'TRUE', NumLines: '12' }),
    field('AdvLink', t('En savoir plus', 'Learn more'), 'URL', { Format: 'Hyperlink' }),
    { ...field('AdvYear', YEAR_TITLE, 'Number', { Decimals: '0', Min: '2000', Max: '2100' }), indexed: true },
    field('AdvPublished', t('Publié', 'Published'), 'Boolean', {}, '0'),
    {
      ...field('AdvKey', t('Clé technique (année-jour)', 'Technical key (year-day)'), 'Text', {
        MaxLength: '16',
        ShowInNewForm: 'FALSE',
        ShowInEditForm: 'FALSE'
      }),
      indexed: true,
      unique: true,
      technical: true
    }
  ]
};

export const SETTINGS_LIST: IListDefinition = {
  key: 'settings',
  urlName: 'AdventSettings',
  title: t("Calendrier de l'Avent – Paramétrage", 'Advent Calendar – Settings'),
  description: t("Profils de thème du calendrier de l'Avent", 'Theme profiles of the Advent calendar'),
  titleField: t('Nom du profil', 'Profile name'),
  titleRequired: true,
  contentType: { id: '0x010017A55F55D6EF4ED0A8E8D81522F1B27B', name: t("Profil de thème de l'Avent", 'Advent theme profile') },
  fields: [
    field('AdvIsActive', t('Profil actif', 'Active profile'), 'Boolean', {}, '0'),
    colorField('AdvPrimaryColor', t('Couleur principale', 'Primary color')),
    colorField('AdvSecondaryColor', t('Couleur secondaire', 'Secondary color')),
    colorField('AdvAccentColor', t("Couleur d'accent", 'Accent color')),
    colorField('AdvBackgroundColor', t('Couleur de fond', 'Background color')),
    colorField('AdvTextColor', t('Couleur du texte', 'Text color')),
    colorField('AdvLockedColor', t('Couleur des cases verrouillées', 'Locked door color')),
    field('AdvFontFamily', t('Police', 'Font'), 'Text', { MaxLength: '255' }),
    field('AdvFontUrl', t('URL de la feuille de police', 'Font URL'), 'URL', { Format: 'Hyperlink' }),
    field('AdvLogo', t('Logo', 'Logo'), 'URL', { Format: 'Image' }),
    field('AdvHeaderTitle', t('Titre affiché', 'Displayed title'), 'Text', { MaxLength: '255' }),
    // 0-32 px: same bounds as the administration form and ThemeService (which clamps older values).
    field('AdvBorderRadius', t('Arrondi des cases (px)', 'Door corner radius (px)'), 'Number', { Decimals: '0', Min: '0', Max: '32' }, '8'),
    field('AdvSnowEffect', t('Effet neige', 'Snow animation'), 'Boolean', {}, '0'),
    // Réglages du sapin (version 2.0) : facultatifs pour l'application (repli sur le modèle « Classique »),
    // donc leur absence sur un site déjà provisionné ne bloque pas les lecteurs ; ajoutés par ProvisioningService.
    { ...colorField('AdvTreeColor', t('Feuillage du sapin', 'Tree foliage')), optional: true },
    // Palette des boules : texte « #RRGGBB,#RRGGBB,… » (3 à 6 couleurs), validé par le formulaire d'administration.
    { ...field('AdvBaubleColors', t('Couleurs des boules', 'Bauble colors'), 'Text', { MaxLength: '64' }), optional: true },
    { ...colorField('AdvStarColor', t('Couleur étoile et guirlande', 'Star and garland color')), optional: true },
    { ...colorField('AdvSceneBackground', t('Fond de scène du sapin', 'Tree scene background')), optional: true },
    // Valeurs : day | snow | night.
    { ...field('AdvSceneStyle', t('Décor du sapin', 'Tree scenery'), 'Text', { MaxLength: '16' }), optional: true },
    { ...field('AdvGarlandLights', t('Guirlande lumineuse', 'Garland lights'), 'Boolean', {}, '1'), optional: true }
  ]
};

export const ADMINS_LIST: IListDefinition = {
  key: 'admins',
  urlName: 'AdventAdmins',
  title: t("Calendrier de l'Avent – Administrateurs", 'Advent Calendar – Administrators'),
  description: t("Administrateurs du calendrier de l'Avent", 'Administrators of the Advent calendar'),
  titleField: LABEL_TITLE,
  titleRequired: false,
  contentType: { id: '0x0100356DF1C2065F47B1A4004162F5BE56F0', name: t("Administrateur de l'Avent", 'Advent administrator') },
  fields: [
    field('AdvAdminUser', t('Administrateur', 'Administrator'), 'User', {
      List: 'UserInfo',
      ShowField: 'ImnName',
      UserSelectionMode: 'PeopleOnly',
      UserSelectionScope: '0',
      Mult: 'FALSE',
      Required: 'TRUE'
    })
  ]
};

/**
 * Clé de la ligne de consultations d'un utilisateur pour une édition. Pas de contrainte d'unicité SharePoint :
 * elle est interdite sur une liste « chacun ne voit que ses éléments » ; l'application vérifie avant d'écrire.
 */
export function viewKey(year: number, userId: number): string {
  return `${year}-${userId}`;
}

/**
 * Consultations : UNE ligne par utilisateur et par édition (1 000 collaborateurs = 1 000 lignes, et non 24 000).
 * Les jours consultés sont stockés en JSON ({ "jour": "date ISO" }), avec leur nombre pour les vues et les tris.
 * La ligne est retrouvée par la clé indexée AdvViewKey (sous le seuil de 5 000 éléments quel que soit le volume).
 * English name "Visits": the term used by the interface (ViewsSyncFailed / ViewsReadFailed).
 */
export const VIEWS_LIST: IListDefinition = {
  key: 'views',
  urlName: 'AdventViews',
  title: t("Calendrier de l'Avent – Consultations", 'Advent Calendar – Visits'),
  description: t(
    'Cases ouvertes par chaque utilisateur (une ligne par utilisateur et par édition)',
    'Doors opened by each user (one item per user and per edition)'
  ),
  titleField: LABEL_TITLE,
  titleRequired: false,
  contentType: { id: '0x01000C21A9D3532A42DF9F0B30AD34A09130', name: t("Consultation de l'Avent", 'Advent visit') },
  optional: true,
  ownItemsOnly: true,
  // Schéma 1.1 (une ligne par jour) : la colonne AdvDay n'est plus alimentée.
  obsoleteFields: ['AdvDay'],
  fields: [
    { ...field('AdvYear', YEAR_TITLE, 'Number', { Decimals: '0', Min: '2000', Max: '2100' }), indexed: true },
    field('AdvViewedCount', t('Nombre de jours consultés', 'Number of doors opened'), 'Number', { Decimals: '0', Min: '0', Max: '24' }),
    { ...field('AdvViewedDays', t('Jours consultés (JSON)', 'Doors opened (JSON)'), 'Note', { NumLines: '6', RichText: 'FALSE' }), technical: true },
    {
      ...field('AdvViewKey', t('Clé technique (année-utilisateur)', 'Technical key (year-user)'), 'Text', {
        MaxLength: '32',
        ShowInNewForm: 'FALSE',
        ShowInEditForm: 'FALSE'
      }),
      indexed: true,
      // SharePoint refuse ReadSecurity = 2 sur une liste qui contient une colonne à valeurs uniques.
      unique: false,
      technical: true
    }
  ]
};

/** Listes vérifiées / réparées au chargement. */
export const ALL_LISTS: IListDefinition[] = [PUBLICATIONS_LIST, SETTINGS_LIST, ADMINS_LIST, VIEWS_LIST];

/** Listes de contenu concernées par « Sécuriser les listes » (la liste des consultations a ses propres droits). */
export const SECURED_LISTS: IListDefinition[] = [PUBLICATIONS_LIST, SETTINGS_LIST, ADMINS_LIST];
