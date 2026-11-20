import { IThemeProfile, IThemeProfileItem } from '../models/IThemeProfile';
import { SETTINGS_LIST } from '../models/listDefinitions';
import { ListResolver } from './pnp';
import { mapThemeItem, serializeBaublePalette } from './ThemeService';

const BASE_FIELDS = [
  'Id', 'Title', 'AdvIsActive', 'AdvPrimaryColor', 'AdvSecondaryColor', 'AdvAccentColor', 'AdvBackgroundColor',
  'AdvTextColor', 'AdvLockedColor', 'AdvFontFamily', 'AdvFontUrl', 'AdvLogo', 'AdvHeaderTitle', 'AdvBorderRadius',
  'AdvSnowEffect'
];

/** Réglages du sapin (2.0) : absents tant que ProvisioningService n'a pas complété la liste d'un site déjà provisionné. */
const TREE_FIELDS = ['AdvTreeColor', 'AdvBaubleColors', 'AdvStarColor', 'AdvSceneBackground', 'AdvSceneStyle', 'AdvGarlandLights'];

export class SettingsService {
  public constructor(private readonly _lists: ListResolver) {}

  public async getAll(): Promise<IThemeProfile[]> {
    try {
      return (await this._query(BASE_FIELDS.concat(TREE_FIELDS))).map(mapThemeItem);
    } catch {
      // Colonnes du sapin pas encore créées : lecture des champs d'origine, le sapin retombe sur le modèle « Classique ».
      return (await this._query(BASE_FIELDS)).map(mapThemeItem);
    }
  }

  private async _query(fields: string[]): Promise<IThemeProfileItem[]> {
    return await this._lists.getList(SETTINGS_LIST).items
      .select(...fields)
      .orderBy('Title', true)
      .top(500)<IThemeProfileItem[]>();
  }

  /**
   * Profil à appliquer : celui forcé dans le volet de propriétés s'il existe encore,
   * sinon le profil actif. `undefined` = thème par défaut.
   */
  public async resolve(forcedId: number | undefined): Promise<IThemeProfile | undefined> {
    const profiles = await this.getAll();
    const forced = forcedId !== undefined ? profiles.find((profile) => profile.id === forcedId) : undefined;
    return forced ?? profiles.find((profile) => profile.isActive);
  }

  /** Enregistre le profil et renvoie son identifiant. */
  public async save(profile: IThemeProfile): Promise<number> {
    const list = this._lists.getList(SETTINGS_LIST);
    const payload = {
      Title: profile.title.trim(),
      AdvPrimaryColor: profile.colors.primary,
      AdvSecondaryColor: profile.colors.secondary,
      AdvAccentColor: profile.colors.accent,
      AdvBackgroundColor: profile.colors.background,
      AdvTextColor: profile.colors.text,
      AdvLockedColor: profile.colors.locked,
      AdvTreeColor: profile.tree.treeColor,
      AdvBaubleColors: serializeBaublePalette(profile.tree.baubleColors),
      AdvStarColor: profile.tree.starColor,
      AdvSceneBackground: profile.tree.sceneBackground,
      AdvSceneStyle: profile.tree.sceneStyle,
      AdvGarlandLights: profile.tree.garlandLights,
      AdvFontFamily: profile.fontFamily.trim(),
      AdvFontUrl: profile.fontUrl ? { Url: profile.fontUrl, Description: profile.fontUrl } : null,
      AdvLogo: profile.logoUrl ? { Url: profile.logoUrl, Description: profile.title } : null,
      AdvHeaderTitle: profile.headerTitle.trim(),
      AdvBorderRadius: profile.borderRadius,
      AdvSnowEffect: profile.snowEffect
    };
    if (profile.id === undefined) {
      const created: { Id: number } = await list.items.add(payload);
      return created.Id;
    }
    await list.items.getById(profile.id).update(payload);
    return profile.id;
  }

  public async remove(id: number): Promise<void> {
    await this._lists.getList(SETTINGS_LIST).items.getById(id).recycle();
  }

  /** Un seul profil actif à la fois : désactive les autres puis active celui demandé. */
  public async setActive(id: number): Promise<void> {
    const list = this._lists.getList(SETTINGS_LIST);
    const actives = await list.items.select('Id').filter('AdvIsActive eq 1').top(500)<Array<{ Id: number }>>();
    for (const item of actives.filter((active) => active.Id !== id)) {
      await list.items.getById(item.Id).update({ AdvIsActive: false });
    }
    await list.items.getById(id).update({ AdvIsActive: true });
  }
}
