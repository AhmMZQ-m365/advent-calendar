import { Nullable } from './spTypes';

export interface IAdmin {
  /** Identifiant de l'élément dans la liste AdventAdmins. */
  itemId: number;
  userId: number;
  displayName: string;
  email: string;
  loginName: string;
}

/** Ligne brute renvoyée par l'API REST pour la liste AdventAdmins. */
export interface IAdminItem {
  Id: number;
  AdvAdminUserId: number;
  AdvAdminUser: Nullable<{
    Title: string;
    EMail: Nullable<string>;
    Name: string;
  }>;
}

export interface IUserSuggestion {
  loginName: string;
  displayName: string;
  email: string;
}
