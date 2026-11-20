import { PermissionKind } from '@pnp/sp/security';
import { SPFI } from './pnp';

export interface ICurrentUserPermissions {
  userId: number;
  loginName: string;
  /** Administrateur de collection de sites ou droit « Gérer le site » (propriétaires). */
  isSiteOwner: boolean;
  /** Droit « Gérer les listes » : nécessaire pour créer ou réparer les listes. */
  canManageLists: boolean;
}

interface ICurrentUserInfo {
  Id: number;
  LoginName: string;
  IsSiteAdmin: boolean;
}

export class PermissionService {
  public constructor(private readonly _sp: SPFI) {}

  public async getCurrentUserPermissions(): Promise<ICurrentUserPermissions> {
    const [user, canManageWeb, canManageLists] = await Promise.all([
      this._sp.web.currentUser.select('Id', 'LoginName', 'IsSiteAdmin')<ICurrentUserInfo>(),
      this._sp.web.currentUserHasPermissions(PermissionKind.ManageWeb),
      this._sp.web.currentUserHasPermissions(PermissionKind.ManageLists)
    ]);
    const isSiteOwner = user.IsSiteAdmin || canManageWeb;
    return {
      userId: user.Id,
      loginName: user.LoginName,
      isSiteOwner,
      canManageLists: isSiteOwner || canManageLists
    };
  }
}
