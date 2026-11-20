/* eslint-disable @rushstack/no-new-null -- Seul point d'entrée de `null` : l'API REST SharePoint (API legacy) renvoie et attend `null` pour les champs vides. */

/** Valeur d'un champ SharePoint tel que lu ou écrit via l'API REST (vide = `null`). */
export type Nullable<T> = T | null;
