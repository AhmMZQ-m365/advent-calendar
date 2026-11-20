import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import calendarStyles from '../AdventCalendar.module.scss';
import { IThemeProfile } from '../../models/IThemeProfile';
import { CalendarDoor } from '../calendar/CalendarDoor';
import { IDoorModel } from '../calendar/calendarModel';
import { SnowEffect } from '../calendar/SnowEffect';
import { TreeThumbnail } from '../calendar/TreeThumbnail';
import { getThemeCssVariables } from '../../services/ThemeService';
import { defaultUnlockDate, getDefaultEdition } from '../../services/dateUtils';

export interface IThemePreviewProps {
  profile: IThemeProfile;
}

const s: Record<string, React.CSSProperties> = {
  stack: { display: 'flex', flexDirection: 'column', gap: '12px' },
  surface: { overflow: 'hidden' },
  title: {
    position: 'relative',
    zIndex: 1,
    margin: '0 0 12px',
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--adv-primary)'
  },
  logo: { position: 'relative', zIndex: 1, display: 'block', height: '28px', width: 'auto', marginBottom: '10px' },
  grid: { position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }
};

/**
 * Aperçu en direct du profil en cours d'édition : le sapin (même composant SVG que le calendrier, en miniature non
 * interactive) puis les portes de la présentation « Grille » (verrouillée, consultée, disponible, vide).
 */
export const ThemePreview: React.FC<IThemePreviewProps> = ({ profile }) => {
  const style = getThemeCssVariables(profile) as React.CSSProperties;
  const year = getDefaultEdition(new Date());

  const doors: IDoorModel[] = [
    { day: 7, state: 'locked', unlockDate: defaultUnlockDate(year, 7), publication: undefined },
    {
      day: 1,
      state: 'opened',
      unlockDate: defaultUnlockDate(year, 1),
      publication: {
        id: 0,
        title: strings.PreviewSampleTitle,
        day: 1,
        year,
        unlockDate: undefined,
        imageUrl: undefined,
        body: '',
        linkUrl: undefined,
        linkText: undefined,
        published: true
      }
    },
    { day: 12, state: 'available', unlockDate: defaultUnlockDate(year, 12), publication: undefined },
    { day: 18, state: 'empty', unlockDate: defaultUnlockDate(year, 18), publication: undefined }
  ];

  return (
    <div style={s.stack} aria-label={strings.PreviewTitle}>
      <div className="ac-card" style={s.surface}>
        <TreeThumbnail profile={profile} />
      </div>

      <div className="ac-card" style={{ ...s.surface, ...style }}>
        <div className={calendarStyles.adventCalendar} style={{ padding: '16px' }}>
          {profile.snowEffect && <SnowEffect />}
          {profile.logoUrl && <img style={s.logo} src={profile.logoUrl} alt="" />}
          <div style={s.title}>{profile.headerTitle || strings.PreviewDefaultHeader}</div>
          <div style={s.grid}>
            {doors.map((door) => (
              <div key={door.day} className={calendarStyles.gridItem}>
                <CalendarDoor door={door} isPreview />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
