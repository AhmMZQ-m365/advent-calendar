import * as strings from 'AdventCalendarWebPartStrings';

/** Langues de l'interface (fichiers loc/fr-fr.js et loc/en-us.js) et du contenu de démonstration. */
export type UiLanguage = 'fr' | 'en';

/**
 * Langue de l'interface = langue du fichier de libellés réellement chargé par SPFx
 * (fr-fr.js pour un utilisateur en fr-FR ; en-us.js, fichier de repli, pour toute autre langue).
 * Le contenu de démonstration et les formats de date suivent donc toujours la langue des libellés.
 */
export function getUiLanguage(): UiLanguage {
  return strings.UiLocale.toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
}

let uiLocale: string = strings.UiLocale;

/**
 * Fixe la locale des formats (dates, tri) à partir de la culture d'interface SharePoint
 * (`pageContext.cultureInfo.currentUICultureName`), appelée une fois par le web part.
 * La culture est retenue si elle est de la même langue que les libellés (ex. en-GB, fr-CA) ;
 * sinon la locale du fichier de libellés est utilisée (ex. de-DE → libellés et dates en-US).
 */
export function initUiLocale(cultureName: string | undefined): void {
  const culture = (cultureName ?? '').trim();
  const language = culture.toLowerCase().split('-')[0];
  uiLocale = culture && language === getUiLanguage() ? culture : strings.UiLocale;
}

/** Locale BCP 47 à passer à `toLocaleDateString`, `localeCompare`, `Intl.*`. */
export function getUiLocale(): string {
  return uiLocale;
}
