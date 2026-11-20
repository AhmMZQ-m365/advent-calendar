import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import styles from '../AdventCalendar.module.scss';
import { CalendarDoor } from './CalendarDoor';
import { IDoorModel } from './calendarModel';

export interface ICalendarGridProps {
  doors: IDoorModel[];
  onOpen: (door: IDoorModel) => void;
}

export const CalendarGrid: React.FC<ICalendarGridProps> = ({ doors, onOpen }) => (
  <div className={styles.grid} role="list" aria-label={strings.GridAriaLabel}>
    {doors.map((door) => (
      <div key={door.day} role="listitem" className={door.day === 24 ? styles.gridItemBig : styles.gridItem}>
        <CalendarDoor door={door} isBig={door.day === 24} onOpen={onOpen} />
      </div>
    ))}
  </div>
);
