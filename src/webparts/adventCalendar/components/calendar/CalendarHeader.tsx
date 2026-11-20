import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import styles from '../AdventCalendar.module.scss';
import { format } from '../../services/format';

export interface ICalendarHeaderProps {
  year: number;
  /** Cases déjà consultées / nombre total de cases. */
  opened: number;
  total: number;
  /** Logo de l'entreprise (profil de thème). */
  logoUrl: string | undefined;
}

/** En-tête de la présentation « Grille » : logo, titre, accroche et progression des cases consultées. */
export const CalendarHeader: React.FC<ICalendarHeaderProps> = ({ year, opened, total, logoUrl }) => (
  <header className={styles.header}>
    <div className={styles.headerBrand}>
      {logoUrl && <img className={styles.headerLogo} src={logoUrl} alt="" />}
      <div>
        <p className={styles.headerTitle}>{format(strings.DefaultHeaderTitle, year)}</p>
        <p className={styles.headerTagline}>{strings.TreeTagline}</p>
      </div>
    </div>
    <div className={styles.progress}>
      <span className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressFill} style={{ width: `${(opened / Math.max(1, total)) * 100}%` }} />
      </span>
      <span className={styles.progressLabel}>{format(strings.TreeProgress, opened, total)}</span>
    </div>
  </header>
);
