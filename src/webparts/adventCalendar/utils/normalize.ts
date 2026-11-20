/** Normalisation des textes pour la recherche (accents, apostrophes et casse ignorés). */

/** Supprime les diacritiques et uniformise les apostrophes. */
function stripDiacritics(value: string): string {
  return value
    .replace(/[\u2018\u2019\u02bc`\u00b4]/g, "'")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Clé de recherche plein texte (accents et casse ignorés). */
export function normalizeSearch(value: string): string {
  return stripDiacritics(value).toLocaleLowerCase();
}
