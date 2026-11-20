import { Nullable } from './spTypes';

export interface IPublication {
  id: number;
  title: string;
  day: number;
  year: number;
  /** Date saisie dans la liste ; `undefined` = date par défaut (jour J de décembre). */
  unlockDate: Date | undefined;
  imageUrl: string | undefined;
  body: string;
  linkUrl: string | undefined;
  linkText: string | undefined;
  published: boolean;
}

export type IPublicationInput = Omit<IPublication, 'id'>;

/** Ligne brute renvoyée par l'API REST pour la liste AdventPublications. */
export interface IPublicationItem {
  Id: number;
  Title: Nullable<string>;
  AdvDay: Nullable<number>;
  AdvYear: Nullable<number>;
  AdvUnlockDate: Nullable<string>;
  AdvImage: Nullable<IUrlFieldValue>;
  AdvBody: Nullable<string>;
  AdvLink: Nullable<IUrlFieldValue>;
  AdvPublished: Nullable<boolean>;
}

export interface IUrlFieldValue {
  Url: string;
  Description: string;
}
