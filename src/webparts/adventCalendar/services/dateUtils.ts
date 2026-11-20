import { IPublication } from '../models/IPublication';
import { Nullable } from '../models/spTypes';
import { getUiLocale } from './locale';

const ISO_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** First month (0-based) of the season of the upcoming edition: November. */
const EDITION_SEASON_START_MONTH = 10;
/** First month (0-based) from which the administration prepares the upcoming edition: September. */
const EDITION_PREPARATION_START_MONTH = 8;

/**
 * Edition displayed when no year is set in the property pane: the current year in November and December,
 * the previous year from January to October, so that the calendar that has just ended stays available
 * (every door open) instead of switching on January 1st to an empty edition.
 * `date`: today, or the simulated date of the test mode.
 */
export function getDefaultEdition(date: Date): number {
  return date.getMonth() >= EDITION_SEASON_START_MONTH ? date.getFullYear() : date.getFullYear() - 1;
}

/**
 * Edition selected by default in Administration › Posts: the displayed edition, except from September on,
 * when the upcoming edition (current year) is the one being prepared while readers still see the previous one.
 */
export function getDefaultAdminEdition(date: Date): number {
  return date.getMonth() >= EDITION_PREPARATION_START_MONTH ? date.getFullYear() : getDefaultEdition(date);
}

/** Date d'ouverture par défaut : le jour J de décembre de l'édition, à minuit (heure locale). */
export function defaultUnlockDate(year: number, day: number): Date {
  return new Date(year, 11, day, 0, 0, 0, 0);
}

export function effectiveUnlockDate(publication: Pick<IPublication, 'unlockDate' | 'year' | 'day'>): Date {
  return publication.unlockDate ?? defaultUnlockDate(publication.year, publication.day);
}

/** Parse une date `AAAA-MM-JJ` en heure locale ; renvoie `undefined` si invalide. */
export function parseIsoDay(value: string | undefined): Date | undefined {
  const match = value ? ISO_DAY_PATTERN.exec(value.trim()) : null;
  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : undefined;
}

/** Date locale → AAAA-MM-JJ (valeur attendue par DateInput) ; chaîne vide si absente. */
export function toIsoDay(date: Date | undefined): string {
  if (!date) {
    return '';
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseSharePointDate(value: Nullable<string>): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

/** « 12 décembre » / « December 12 » (locale de l'interface). */
export function formatDayMonth(date: Date): string {
  return date.toLocaleDateString(getUiLocale(), { day: 'numeric', month: 'long' });
}

/** « 24/12/2026 » (fr-FR) / « 12/24/2026 » (en-US) (locale de l'interface, jour et mois sur 2 chiffres). */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(getUiLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Ordre des parties d'une date courte dans la locale de l'interface (saisie au clavier de DateInput). */
export type DatePartOrder = 'dmy' | 'mdy' | 'ymd';

export function getDatePartOrder(): DatePartOrder {
  try {
    const order = new Intl.DateTimeFormat(getUiLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' })
      .formatToParts(new Date(2026, 11, 24))
      .filter((part) => part.type === 'day' || part.type === 'month' || part.type === 'year')
      .map((part) => part.type[0])
      .join('');
    return order === 'mdy' || order === 'ymd' ? order : 'dmy';
  } catch {
    return 'dmy';
  }
}
