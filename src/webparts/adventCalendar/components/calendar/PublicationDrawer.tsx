import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import styles from '../AdventCalendar.module.scss';
import { Modal } from '../common/Modal';
import { a } from '../common/layoutStyles';
import { IPublication } from '../../models/IPublication';
import { starPath } from '../../defaults/tree/treeLayout';
import { sanitizeHtml } from '../../services/htmlSanitizer';
import { format } from '../../services/format';
import { Icon } from '../../theme/Icons';

export interface IPublicationDrawerProps {
  publication: IPublication | undefined;
  onClose: () => void;
}

/** Étoiles et points du bandeau généré (couleur : filet des portes du profil, aucune transparence). */
const HERO_STARS: Array<{ x: number; y: number; r: number }> = [
  { x: 330, y: 44, r: 20 },
  { x: 250, y: 112, r: 11 },
  { x: 90, y: 38, r: 9 },
  { x: 180, y: 70, r: 6 }
];
const HERO_DOTS: Array<{ x: number; y: number; r: number }> = [
  { x: 300, y: 128, r: 4 }, { x: 140, y: 120, r: 3 }, { x: 370, y: 100, r: 3 }, { x: 60, y: 96, r: 4 }, { x: 215, y: 24, r: 3 }
];

/** Bandeau décoratif d'une publication sans image : numéro du jour sur le dégradé du profil. */
const PublicationHero: React.FC<{ day: number }> = ({ day }) => (
  <div className={styles.publicationHero} aria-hidden="true">
    <svg className={styles.publicationHeroArt} viewBox="0 0 400 160" preserveAspectRatio="xMaxYMid slice" focusable="false">
      {HERO_STARS.map((star) => (
        <path key={`${star.x}-${star.y}`} d={starPath(star.x, star.y, star.r, star.r * 0.42)} style={{ fill: 'var(--adv-primary-line)' }} />
      ))}
      {HERO_DOTS.map((dot) => (
        <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r={dot.r} style={{ fill: 'var(--adv-primary-line)' }} />
      ))}
    </svg>
    <span className={styles.publicationHeroDay}>{day}</span>
    <span className={styles.publicationHeroMonth}>{strings.PublicationMonth}</span>
  </div>
);

/** Détail d'une case ouverte, dans une pop-up centrée (`Modal`, Échap / clic extérieur pour fermer). */
export const PublicationDrawer: React.FC<IPublicationDrawerProps> = ({ publication, onClose }) => {
  // On garde la dernière publication affichée pendant l'animation de fermeture.
  const [shown, setShown] = React.useState<IPublication | undefined>(publication);
  React.useEffect(() => {
    if (publication) {
      setShown(publication);
    }
  }, [publication]);

  const safeBody = React.useMemo(() => sanitizeHtml(shown?.body), [shown]);

  return (
    <Modal
      open={!!publication}
      onClose={onClose}
      title={shown?.title ?? ''}
      subtitle={shown ? format(strings.PublicationDayLabel, shown.day) : undefined}
      width="760px"
      initialFocus="panel"
      footer={
        <div style={a.footer}>
          <button type="button" className="ac-btn ac-btn-outline" onClick={onClose}>
            {strings.Close}
          </button>
          {shown?.linkUrl && (
            <a className="ac-btn ac-btn-primary" href={shown.linkUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="external" size={16} />
              {shown.linkText || strings.PublicationReadMore}
            </a>
          )}
        </div>
      }
    >
      {shown && (
        <div className={styles.publication}>
          {shown.imageUrl
            ? <img className={styles.publicationImage} src={shown.imageUrl} alt={shown.title} />
            : <PublicationHero day={shown.day} />}
          {/* Contenu assaini par DOMPurify (sanitizeHtml) avant injection. */}
          <div className={`${styles.publicationBody} ac-prose`} dangerouslySetInnerHTML={{ __html: safeBody }} />
        </div>
      )}
    </Modal>
  );
};
