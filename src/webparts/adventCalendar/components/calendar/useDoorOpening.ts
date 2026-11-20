import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { IDoorModel } from './calendarModel';
import { formatDayMonth } from '../../services/dateUtils';
import { format } from '../../services/format';

const OPENING_DURATION_MS = 800;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface IDoorOpening {
  isInteractive: boolean;
  isOpening: boolean;
  handleClick: () => void;
  ariaLabel: string;
  /** Infobulle native « Disponible le X décembre » des cases verrouillées. */
  tooltip: string | undefined;
}

/**
 * Comportement commun d'une case (porte de la grille ou boule du sapin) :
 * animation d'ouverture puis ouverture de la publication, libellés accessibles.
 */
export function useDoorOpening(door: IDoorModel, isPreview: boolean, onOpen: ((door: IDoorModel) => void) | undefined): IDoorOpening {
  const [isOpening, setIsOpening] = React.useState<boolean>(false);
  const timerRef = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const isInteractive = !isPreview && (door.state === 'available' || door.state === 'opened');

  const handleClick = React.useCallback((): void => {
    if (!isInteractive || isOpening || !onOpen) {
      return;
    }
    if (door.state === 'opened' || prefersReducedMotion()) {
      onOpen(door);
      return;
    }
    setIsOpening(true);
    timerRef.current = window.setTimeout(() => {
      setIsOpening(false);
      onOpen(door);
    }, OPENING_DURATION_MS);
  }, [door, isInteractive, isOpening, onOpen]);

  let ariaLabel: string;
  switch (door.state) {
    case 'locked':
      ariaLabel = format(strings.DoorLockedAriaLabel, door.day, formatDayMonth(door.unlockDate));
      break;
    case 'empty':
      ariaLabel = format(strings.DoorEmptyAriaLabel, door.day);
      break;
    case 'opened':
      ariaLabel = format(strings.DoorViewedAriaLabel, door.day, door.publication?.title ?? '');
      break;
    default:
      ariaLabel = format(strings.DoorOpenAriaLabel, door.day, door.publication?.title ?? '');
  }

  let tooltip: string | undefined;
  if (!isPreview && door.state === 'locked') {
    tooltip = format(strings.DoorAvailableOn, formatDayMonth(door.unlockDate));
  } else if (!isPreview && door.state === 'opened') {
    tooltip = strings.DoorViewed;
  }

  return { isInteractive, isOpening, handleClick, ariaLabel, tooltip };
}
