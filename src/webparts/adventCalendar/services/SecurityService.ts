import { IListDefinition, SECURED_LISTS } from '../models/listDefinitions';
import { isNotFound, ListResolver, SPFI } from './pnp';
import { ISiteGroup } from '@pnp/sp/site-groups';

/** Valeurs de SP.RoleType. */
const ROLE_TYPE = {
  limitedAccess: 1,
  reader: 2,
  contributor: 3,
  administrator: 5
} as const;

const PRINCIPAL_TYPE_USER = 1;

export interface IListSecurityStatus {
  definition: IListDefinition;
  hasUniquePermissions: boolean;
}

interface IRoleAssignmentInfo {
  PrincipalId: number;
  Member: { PrincipalType: number };
  RoleDefinitionBindings: Array<{ Id: number; RoleTypeKind: number }>;
}

/**
 * Sécurisation des listes : masquer l'interface d'administration ne protège pas les données,
 * n'importe quel membre du site pouvant écrire dans les listes via SharePoint ou l'API REST.
 * Ce service casse l'héritage des trois listes puis applique :
 * propriétaires = Contrôle total, administrateurs listés = Collaboration, membres et visiteurs = Lecture.
 */
export class SecurityService {
  public constructor(private readonly _sp: SPFI, private readonly _lists: ListResolver) {}

  public async getStatus(): Promise<IListSecurityStatus[]> {
    return Promise.all(SECURED_LISTS.map(async (definition) => {
      const info = await this._lists.getList(definition).select('HasUniqueRoleAssignments')<{ HasUniqueRoleAssignments: boolean }>();
      return { definition, hasUniquePermissions: info.HasUniqueRoleAssignments };
    }));
  }

  public async isAnyListSecured(): Promise<boolean> {
    const statuses = await this.getStatus();
    return statuses.some((status) => status.hasUniquePermissions);
  }

  /** Opération idempotente : peut être relancée après chaque modification de la liste des administrateurs. */
  public async applySecurity(adminUserIds: number[], currentUserId: number): Promise<void> {
    const web = this._sp.web;
    const [fullControl, contribute, read] = await Promise.all([
      web.roleDefinitions.getByType(ROLE_TYPE.administrator).select('Id')<{ Id: number }>(),
      web.roleDefinitions.getByType(ROLE_TYPE.contributor).select('Id')<{ Id: number }>(),
      web.roleDefinitions.getByType(ROLE_TYPE.reader).select('Id')<{ Id: number }>()
    ]);
    const [ownersId, membersId, visitorsId] = await Promise.all([
      this._groupId(web.associatedOwnerGroup),
      this._groupId(web.associatedMemberGroup),
      this._groupId(web.associatedVisitorGroup)
    ]);

    const desired = new Map<number, number>();
    if (membersId !== undefined) {
      desired.set(membersId, read.Id);
    }
    if (visitorsId !== undefined) {
      desired.set(visitorsId, read.Id);
    }
    (await this._keepUsers(adminUserIds)).forEach((userId) => desired.set(userId, contribute.Id));
    if (ownersId !== undefined) {
      desired.set(ownersId, fullControl.Id);
    }

    for (const definition of SECURED_LISTS) {
      await this._applyToList(definition, desired, read.Id, currentUserId);
    }
  }

  /** Ne garde que les identifiants d'utilisateurs : un groupe inséré dans AdventAdmins ne reçoit aucun droit. */
  private async _keepUsers(ids: number[]): Promise<number[]> {
    const unique = ids.filter((id, index) => ids.indexOf(id) === index);
    const checked = await Promise.all(unique.map(async (id) => {
      try {
        const principal = await this._sp.web.siteUsers.getById(id).select('PrincipalType')<{ PrincipalType: number }>();
        return principal.PrincipalType === PRINCIPAL_TYPE_USER ? id : undefined;
      } catch (error) {
        // Utilisateur supprimé : ignoré. Toute autre erreur (429, réseau, 5xx) interrompt l'opération.
        if (isNotFound(error)) {
          return undefined;
        }
        throw error;
      }
    }));
    return checked.filter((id): id is number => id !== undefined);
  }

  private async _applyToList(
    definition: IListDefinition,
    desired: Map<number, number>,
    readRoleId: number,
    currentUserId: number
  ): Promise<void> {
    const list = this._lists.getList(definition);
    const info = await list.select('HasUniqueRoleAssignments')<{ HasUniqueRoleAssignments: boolean }>();
    if (!info.HasUniqueRoleAssignments) {
      // Sans copie des droits hérités : on repart d'une base vide (SharePoint ajoute l'utilisateur courant).
      await list.breakRoleInheritance(false, true);
    }

    const assignments = await list.roleAssignments
      .select('PrincipalId', 'Member/PrincipalType', 'RoleDefinitionBindings/Id', 'RoleDefinitionBindings/RoleTypeKind')
      .expand('Member', 'RoleDefinitionBindings')<IRoleAssignmentInfo[]>();

    const satisfied = new Set<number>();
    for (const assignment of assignments) {
      const principalId = assignment.PrincipalId;
      if (principalId === currentUserId && !desired.has(principalId)) {
        // On conserve l'accès direct de la personne qui applique la sécurité.
        continue;
      }
      const isUser = assignment.Member.PrincipalType === PRINCIPAL_TYPE_USER;
      // Utilisateur non administrateur : aucun droit direct. Autre groupe : lecture seule.
      const target = desired.get(principalId) ?? (isUser ? undefined : readRoleId);
      for (const binding of assignment.RoleDefinitionBindings) {
        if (binding.RoleTypeKind === ROLE_TYPE.limitedAccess) {
          continue;
        }
        if (binding.Id === target) {
          satisfied.add(principalId);
        } else {
          await list.roleAssignments.remove(principalId, binding.Id);
        }
      }
      if (target !== undefined && !satisfied.has(principalId)) {
        await list.roleAssignments.add(principalId, target);
        satisfied.add(principalId);
      }
    }

    for (const [principalId, roleId] of Array.from(desired.entries())) {
      if (!satisfied.has(principalId)) {
        await list.roleAssignments.add(principalId, roleId);
      }
    }
  }

  private async _groupId(group: ISiteGroup): Promise<number | undefined> {
    try {
      const info = await group.select('Id')<{ Id: number }>();
      return info.Id;
    } catch {
      return undefined;
    }
  }
}
