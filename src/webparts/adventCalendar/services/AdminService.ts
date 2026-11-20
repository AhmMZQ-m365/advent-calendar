import { IAdmin, IAdminItem, IUserSuggestion } from '../models/IAdmin';
import { ADMINS_LIST } from '../models/listDefinitions';
import { getUiLocale } from './locale';
import { ListResolver, SPFI } from './pnp';

/** Recherche limitée aux utilisateurs (pas de groupes), toutes sources confondues. */
const PRINCIPAL_TYPE_USER = 1;
const PRINCIPAL_SOURCE_ALL = 15;

interface IPeoplePickerEntity {
  Key: string;
  DisplayText: string;
  EntityData?: { Email?: string };
}

export class AdminService {
  public constructor(private readonly _sp: SPFI, private readonly _lists: ListResolver) {}

  public async getAll(): Promise<IAdmin[]> {
    const items = await this._lists.getList(ADMINS_LIST).items
      .select('Id', 'AdvAdminUserId', 'AdvAdminUser/Title', 'AdvAdminUser/EMail', 'AdvAdminUser/Name')
      .expand('AdvAdminUser')
      .top(500)<IAdminItem[]>();
    return items
      .filter((item) => !!item.AdvAdminUser)
      .map((item) => ({
        itemId: item.Id,
        userId: item.AdvAdminUserId,
        displayName: item.AdvAdminUser?.Title ?? '',
        email: item.AdvAdminUser?.EMail ?? '',
        loginName: item.AdvAdminUser?.Name ?? ''
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, getUiLocale()));
  }

  public async isListedAdmin(userId: number): Promise<boolean> {
    const items = await this._lists.getList(ADMINS_LIST).items
      .select('Id')
      .filter(`AdvAdminUserId eq ${userId}`)
      .top(1)<Array<{ Id: number }>>();
    return items.length > 0;
  }

  /** Ajoute un administrateur à partir de son identifiant de connexion ; renvoie son id utilisateur sur le site. */
  public async add(user: IUserSuggestion): Promise<number> {
    const ensured = await this._sp.web.ensureUser(user.loginName);
    const userId = ensured.Id;
    if (!(await this.isListedAdmin(userId))) {
      await this._lists.getList(ADMINS_LIST).items.add({
        Title: user.displayName,
        AdvAdminUserId: userId
      });
    }
    return userId;
  }

  public async remove(itemId: number): Promise<void> {
    await this._lists.getList(ADMINS_LIST).items.getById(itemId).delete();
  }

  public async searchUsers(query: string): Promise<IUserSuggestion[]> {
    if (query.trim().length < 2) {
      return [];
    }
    const results: IPeoplePickerEntity[] = await this._sp.profiles.clientPeoplePickerSearchUser({
      QueryString: query.trim(),
      MaximumEntitySuggestions: 10,
      PrincipalType: PRINCIPAL_TYPE_USER,
      PrincipalSource: PRINCIPAL_SOURCE_ALL,
      AllowEmailAddresses: true,
      AllowMultipleEntities: false,
      AllUrlZones: false
    });
    return results.map((entity) => ({
      loginName: entity.Key,
      displayName: entity.DisplayText,
      email: entity.EntityData?.Email ?? ''
    }));
  }
}
