import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { YearSelect } from '../common/YearSelect';
import { SegmentedControl, ISegmentedOption } from '../common/SegmentedControl';
import { Icon } from '../../theme/Icons';
import { formatCount } from '../../services/format';

export type DayStatus = 'published' | 'draft' | 'empty';

/** Filtre de statut : un seul statut à la fois, ou « all » (tous). */
export type StatusFilter = 'all' | DayStatus;

export interface IPublicationFiltersState {
  year: number;
  status: StatusFilter;
  search: string;
}

export const STATUS_LABELS: Record<DayStatus, string> = {
  published: strings.StatusPublished,
  draft: strings.StatusDraft,
  empty: strings.NoPublication
};

const STATUS_OPTIONS: StatusFilter[] = ['all', 'published', 'draft', 'empty'];

/** Filtres remis à zéro (statut et recherche ; l'année est conservée). */
export function resetFilters(filters: IPublicationFiltersState): IPublicationFiltersState {
  return { ...filters, status: 'all', search: '' };
}

/** Vrai si un filtre autre que l'année est actif. */
export function hasActiveFilters(filters: IPublicationFiltersState): boolean {
  return filters.status !== 'all' || filters.search.trim().length > 0;
}

export interface IPublicationFiltersProps {
  filters: IPublicationFiltersState;
  years: number[];
  /** Nombre de jours par statut (toutes lignes de l'édition, avant filtrage). */
  counts: Record<DayStatus, number>;
  /** Nombre de jours affichés après filtrage. */
  resultCount: number;
  onChange: (filters: IPublicationFiltersState) => void;
}

/**
 * Barre d'outils au-dessus du tableau (façon data-table) : recherche (titre ou numéro du jour), année,
 * statut en contrôle segmenté, nombre de jours affichés et « Réinitialiser ».
 * Responsive par requête de conteneur (`.ac-filterbar`, theme/responsiveStyles.ts).
 */
export const PublicationFilters: React.FC<IPublicationFiltersProps> = ({ filters, years, counts, resultCount, onChange }) => {
  const total = counts.published + counts.draft + counts.empty;

  const options: Array<ISegmentedOption<StatusFilter>> = STATUS_OPTIONS.map((status) => ({
    value: status,
    label: status === 'all' ? strings.StatusAll : STATUS_LABELS[status],
    count: status === 'all' ? total : counts[status]
  }));

  return (
    <div className="ac-filterbar">
      <div className="ac-input-wrap ac-input-wrap--icon ac-filterbar-search">
        <span className="ac-input-icon"><Icon name="search" size={16} /></span>
        <input
          className="ac-input"
          type="search"
          aria-label={strings.Search}
          placeholder={strings.SearchPlaceholder}
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </div>

      <YearSelect years={years} value={filters.year} onChange={(year) => onChange({ ...filters, year })} />

      <SegmentedControl
        options={options}
        value={filters.status}
        onChange={(status) => onChange({ ...filters, status })}
        ariaLabel={strings.FilterByStatus}
      />

      <div className="ac-filterbar-end">
        <span className="ac-filterbar-count" aria-live="polite">
          {formatCount(resultCount, strings.DaysCountSingular, strings.DaysCountPlural, resultCount)}
        </span>
        {hasActiveFilters(filters) && (
          <button
            type="button"
            className="ac-btn ac-btn-ghost ac-btn-sm"
            onClick={() => onChange(resetFilters(filters))}
          >
            <Icon name="reset" size={14} />
            {strings.Reset}
          </button>
        )}
      </div>
    </div>
  );
};
