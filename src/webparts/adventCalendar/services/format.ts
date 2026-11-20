import { Nullable } from '../models/spTypes';
import { getUiLocale } from './locale';

/** Remplace `{0}`, `{1}`… par les arguments (chaînes localisées des fichiers loc/). */
export function format(template: string, ...args: Array<string | number>): string {
  return template.replace(/\{(\d+)\}/g, (match: string, index: string) => {
    const value = args[Number(index)];
    return value === undefined ? match : String(value);
  });
}

/**
 * Choisit le singulier ou le pluriel selon `count` et les règles de la langue de l'interface
 * (français : 0 et 1 au singulier ; anglais : 1 seulement), puis remplace `{0}`, `{1}`…
 */
export function formatCount(count: number, one: string, other: string, ...args: Array<string | number>): string {
  let isOne: boolean;
  try {
    isOne = new Intl.PluralRules(getUiLocale()).select(count) === 'one';
  } catch {
    isOne = count === 1;
  }
  return format(isOne ? one : other, ...args);
}

/** Message lisible à partir d'une erreur quelconque (y compris les erreurs HTTP PnPjs). */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Les erreurs HTTP PnPjs embarquent le corps de la réponse SharePoint : on en extrait le message utile.
    const spMessage = /"message"\s*:\s*\{[^}]*"value"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(error.message);
    if (spMessage) {
      try {
        return JSON.parse(`"${spMessage[1]}"`) as string;
      } catch {
        return spMessage[1];
      }
    }
    return error.message;
  }
  return typeof error === 'string' ? error : JSON.stringify(error);
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** URL HTTPS (insensible à la casse), sans autre contrôle. */
export function isHttpsUrl(value: string): boolean {
  return /^https:\/\//i.test(value);
}

/** Renvoie l'URL si elle est en http(s), sinon `undefined` (valeur lue dans une liste : jamais `javascript:` ni `data:`). */
export function safeHttpUrl(value: Nullable<string> | undefined): string | undefined {
  return value && isHttpUrl(value) ? value : undefined;
}
