import type { UiLanguage } from '../services/locale';

/** One text per UI language (keys = `UiLanguage`). */
export interface ILocalizedText {
  fr: string;
  en: string;
}

/** Text in the given language, French as a fallback. */
export function localize(text: ILocalizedText, language: UiLanguage): string {
  return text[language] || text.fr;
}
