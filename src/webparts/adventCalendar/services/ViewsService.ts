import { VIEWS_LIST, viewKey } from '../models/listDefinitions';
import { Nullable } from '../models/spTypes';
import { ListResolver } from './pnp';

interface IViewItem {
  Id: number;
  AdvViewedDays: Nullable<string>;
}

/** Jours consultés : { "jour": "date ISO de la première consultation" }. */
type ViewedDays = Record<string, string>;

/** Lit le JSON d'une ligne ; contenu absent ou invalide = aucun jour. */
function parseViewedDays(json: Nullable<string>): ViewedDays {
  if (!json) {
    return {};
  }
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }
    const result: ViewedDays = {};
    Object.keys(value).forEach((key) => {
      const day = Number(key);
      const date = (value as Record<string, unknown>)[key];
      if (Number.isInteger(day) && day >= 1 && day <= 24) {
        result[String(day)] = typeof date === 'string' ? date : '';
      }
    });
    return result;
  } catch {
    return {};
  }
}

/** Fusionne plusieurs lignes (cas rare : première consultation sur deux appareils au même instant). */
function mergeRows(items: IViewItem[]): ViewedDays {
  return items.reduce<ViewedDays>((all, item) => ({ ...parseViewedDays(item.AdvViewedDays), ...all }), {});
}

/**
 * Consultations enregistrées dans SharePoint (liste AdventViews) : UNE ligne par utilisateur et par édition,
 * retrouvée par la clé indexée AdvViewKey ; les jours consultés sont stockés en JSON avec leur date.
 * L'utilisateur est l'auteur de la ligne (« Créé par ») ; les droits de la liste font que chacun ne voit que sa ligne.
 */
export class ViewsService {
  /** Sérialise les écritures : lecture puis mise à jour du JSON ne doivent pas se chevaucher. */
  private _queue: Promise<void> = Promise.resolve();

  public constructor(private readonly _lists: ListResolver) {}

  /** Jours déjà consultés par l'utilisateur pour l'édition. */
  public async getViewedDays(year: number, userId: number): Promise<Set<number>> {
    const days = mergeRows(await this._getRows(year, userId));
    return new Set(Object.keys(days).map(Number));
  }

  /** Ajoute le jour à la ligne de l'utilisateur (la crée à la première consultation de l'édition). */
  public markViewed(year: number, day: number, userId: number): Promise<void> {
    const run = this._queue.then(() => this._markViewed(year, day, userId));
    this._queue = run.catch(() => undefined);
    return run;
  }

  private async _markViewed(year: number, day: number, userId: number): Promise<void> {
    const list = this._lists.getList(VIEWS_LIST);
    const rows = await this._getRows(year, userId);
    const days = mergeRows(rows);
    if (days[String(day)] !== undefined) {
      return;
    }
    days[String(day)] = new Date().toISOString();
    const payload = {
      AdvViewedDays: JSON.stringify(days),
      AdvViewedCount: Object.keys(days).length
    };

    if (rows.length === 0) {
      await list.items.add({
        Title: `Consultations ${year}`,
        AdvYear: year,
        AdvViewKey: viewKey(year, userId),
        ...payload
      });
    } else {
      await list.items.getById(rows[0].Id).update(payload);
    }
  }

  private _getRows(year: number, userId: number): Promise<IViewItem[]> {
    return this._lists.getList(VIEWS_LIST).items
      .select('Id', 'AdvViewedDays')
      .filter(`AdvViewKey eq '${viewKey(year, userId)}'`)
      .orderBy('Id', true)
      .top(10)<IViewItem[]>();
  }
}
