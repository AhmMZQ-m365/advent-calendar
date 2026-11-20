import { IAdventServices } from '../services/AdventServices';

/** Présentation du calendrier : sapin (par défaut) ou grille de portes. */
export type CalendarLayout = 'tree' | 'grid';

export interface IAdventCalendarProps {
  services: IAdventServices;
  /** Édition affichée (filtre AdvYear). */
  year: number;
  /** Edition selected by default in the administration (getDefaultAdminEdition, or the year set in the property pane). */
  adminYear: number;
  /** Date du jour effective (réelle, ou simulée en mode test). */
  today: Date;
  /** Date simulée active (mode test, en mode édition uniquement). */
  isDateSimulated: boolean;
  /** Profil de thème forcé dans le volet de propriétés ; `undefined` = profil actif. */
  themeProfileId: number | undefined;
  layout: CalendarLayout;
}
