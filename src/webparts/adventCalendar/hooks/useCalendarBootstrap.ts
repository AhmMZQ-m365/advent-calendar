import { IAdventServices } from '../services/AdventServices';
import { ICurrentUserPermissions } from '../services/PermissionService';
import { IProvisioningResult } from '../services/ProvisioningService';
import { IAsyncData, useAsyncData } from './useAsyncData';

export interface ICalendarBootstrap {
  permissions: ICurrentUserPermissions;
  provisioning: IProvisioningResult;
  /** Présent dans AdventAdmins ou propriétaire du site. */
  isAdmin: boolean;
}

/** Permissions de l'utilisateur, vérification / réparation des listes, puis statut administrateur. */
export function useCalendarBootstrap(services: IAdventServices): IAsyncData<ICalendarBootstrap> {
  return useAsyncData<ICalendarBootstrap>(async () => {
    const permissions = await services.permissions.getCurrentUserPermissions();
    const provisioning = await services.provisioning.ensure(permissions.canManageLists, permissions.isSiteOwner);
    let isAdmin = permissions.isSiteOwner;
    if (!isAdmin && provisioning.state !== 'blocked') {
      isAdmin = await services.admins.isListedAdmin(permissions.userId);
    }
    return { permissions, provisioning, isAdmin };
  }, [services]);
}
