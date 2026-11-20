/**
 * Mémorise localement (localStorage) les cases déjà ouvertes par l'utilisateur.
 * Le stockage peut être indisponible (navigation privée, stratégie du navigateur) :
 * chaque accès est protégé et l'application fonctionne sans.
 */
export class OpenedDaysStore {
  private readonly _keyPrefix: string;

  public constructor(webId: string, userLoginName: string) {
    this._keyPrefix = `advent-calendar:${webId}:${userLoginName.toLowerCase()}`;
  }

  public getOpenedDays(year: number): Set<number> {
    try {
      const raw = window.localStorage.getItem(this._key(year));
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((value): value is number => typeof value === 'number'));
      }
    } catch {
      // Stockage indisponible ou contenu corrompu : on repart d'un état vide.
    }
    return new Set<number>();
  }

  public markOpened(year: number, day: number): Set<number> {
    const days = this.getOpenedDays(year);
    days.add(day);
    try {
      window.localStorage.setItem(this._key(year), JSON.stringify(Array.from(days)));
    } catch {
      // Stockage indisponible : l'état reste en mémoire pour la session.
    }
    return days;
  }

  private _key(year: number): string {
    return `${this._keyPrefix}:${year}`;
  }
}
