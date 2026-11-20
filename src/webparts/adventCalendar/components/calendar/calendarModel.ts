import { IPublication } from '../../models/IPublication';
import { defaultUnlockDate, effectiveUnlockDate, getDefaultEdition } from '../../services/dateUtils';

export type DoorState = 'locked' | 'available' | 'opened' | 'empty';

export interface IDoorModel {
  day: number;
  state: DoorState;
  unlockDate: Date;
  publication: IPublication | undefined;
}

/**
 * Ordre d'affichage des cases, mélangé comme sur un vrai calendrier : celui des boules du sapin
 * (lecture de haut en bas, cf. defaults/tree/treeLayout.ts), repris par la grille pour que les deux présentations concordent.
 * Volontairement figé : l'ordre est identique à chaque chargement et pour tous les utilisateurs.
 */
export const DOOR_LAYOUT: number[] = [13, 1, 4, 20, 12, 23, 3, 16, 24, 17, 6, 9, 11, 22, 19, 15, 10, 5, 18, 21, 8, 14, 7, 2];

/**
 * Cases fictives des aperçus (administration) : 3 consultées, 15 à découvrir, 6 verrouillées,
 * pour que le profil soit jugé sur tous ses états. Publication absente : aperçu non interactif.
 */
export function buildPreviewDoors(): IDoorModel[] {
  const year = getDefaultEdition(new Date());
  const stateOf = (day: number): DoorState => {
    if (day <= 3) {
      return 'opened';
    }
    return day >= 19 ? 'locked' : 'available';
  };
  return DOOR_LAYOUT.map((day): IDoorModel => ({
    day,
    state: stateOf(day),
    unlockDate: defaultUnlockDate(year, day),
    publication: undefined
  }));
}

/** Nombre de cases dans un état donné. */
export function countByState(doors: IDoorModel[], state: DoorState): number {
  return doors.filter((door) => door.state === state).length;
}

export function buildDoors(
  publications: IPublication[],
  year: number,
  today: Date,
  openedDays: Set<number>
): IDoorModel[] {
  const byDay = new Map<number, IPublication>();
  publications
    .filter((publication) => publication.published && publication.year === year)
    .forEach((publication) => byDay.set(publication.day, publication));

  return DOOR_LAYOUT.map((day) => {
    const publication = byDay.get(day);
    if (!publication) {
      return { day, state: 'empty', unlockDate: defaultUnlockDate(year, day), publication: undefined };
    }
    const unlockDate = effectiveUnlockDate(publication);
    let state: DoorState = 'available';
    if (today.getTime() < unlockDate.getTime()) {
      state = 'locked';
    } else if (openedDays.has(day)) {
      state = 'opened';
    }
    return { day, state, unlockDate, publication };
  });
}
