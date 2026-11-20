import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import styles from '../AdventCalendar.module.scss';
import { DoorState, IDoorModel } from './calendarModel';
import { useDoorOpening } from './useDoorOpening';
import { Icon } from '../../theme/Icons';

export interface ICalendarDoorProps {
  door: IDoorModel;
  isBig?: boolean;
  /** Mode aperçu (onglet Paramétrage) : pas d'interaction ni d'infobulle. */
  isPreview?: boolean;
  onOpen?: (door: IDoorModel) => void;
}

const STATE_CLASS_NAMES: Record<DoorState, string> = {
  locked: styles.doorLocked,
  available: styles.doorAvailable,
  opened: styles.doorOpened,
  empty: styles.doorEmpty
};

/** Case de la présentation « Grille » : porte qui pivote en 3D (couleurs du profil, poignée et cadre en creux). */
export const CalendarDoor: React.FC<ICalendarDoorProps> = ({ door, isBig, isPreview, onOpen }) => {
  const { isInteractive, isOpening, handleClick, ariaLabel, tooltip } = useDoorOpening(door, !!isPreview, onOpen);
  const publication = door.publication;

  const classNames = [
    styles.door,
    STATE_CLASS_NAMES[door.state],
    door.day % 2 === 0 ? styles.doorAlt : '',
    isBig ? styles.doorBig : '',
    isOpening || door.state === 'opened' ? styles.doorIsOpen : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={`${styles.doorHost} ${isBig ? styles.doorBig : ''}`}>
      <button
        type="button"
        className={classNames}
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-disabled={!isInteractive}
        title={tooltip}
        tabIndex={isPreview ? -1 : 0}
      >
        <span className={styles.doorInside} aria-hidden="true">
          {door.state !== 'locked' && publication?.imageUrl ? (
            <img className={styles.doorInsideImage} src={publication.imageUrl} alt="" loading="lazy" />
          ) : (
            <span className={styles.doorInsideGlyph}><Icon name="sparkles" size={28} /></span>
          )}
          <span className={styles.doorInsideDay}>{door.day}</span>
          {publication && door.state !== 'locked' && <span className={styles.doorInsideTitle}>{publication.title}</span>}
          {door.state === 'opened' && (
            <span className={styles.doorViewed}>
              <Icon name="check" size={12} style={{ strokeWidth: 3 }} />
              {strings.DoorViewedBadge}
            </span>
          )}
        </span>
        <span className={styles.doorLeaf} aria-hidden="true">
          <span className={styles.doorNumber}>{door.day}</span>
          {door.state === 'locked' && <Icon name="lock" size={16} className={styles.doorLockIcon} />}
          {door.state === 'empty' && <span className={styles.doorSoon}>{strings.DoorSoon}</span>}
        </span>
      </button>
    </div>
  );
};
