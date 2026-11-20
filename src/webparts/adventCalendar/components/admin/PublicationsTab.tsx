import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { IAdventServices } from '../../services/AdventServices';
import { IPublication, IPublicationInput } from '../../models/IPublication';
import { useAsyncData } from '../../hooks/useAsyncData';
import { effectiveUnlockDate, formatShortDate } from '../../services/dateUtils';
import { format, formatCount, getErrorMessage } from '../../services/format';
import { normalizeSearch } from '../../utils/normalize';
import { Icon } from '../../theme/Icons';
import { StatusMessage } from '../common/StatusMessage';
import { Loader } from '../common/Loader';
import { Badge, BadgeVariant } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ConfirmModal } from '../common/ConfirmModal';
import { NotifyFn } from '../common/Toasts';
import { PublicationFormModal } from './PublicationForm';
import {
  DayStatus,
  hasActiveFilters,
  IPublicationFiltersState,
  PublicationFilters,
  resetFilters,
  STATUS_LABELS
} from './PublicationFilters';
import { a } from '../common/layoutStyles';

export interface IPublicationsTabProps {
  services: IAdventServices;
  defaultYear: number;
  /** Incrémenté par le bouton « Nouvelle publication » de la barre de titre. */
  createSignal: number;
  notify: NotifyFn;
}

interface IDayRow {
  day: number;
  status: DayStatus;
  publication: IPublication | undefined;
}

type EditorState = { day: number; publication: IPublication | undefined } | undefined;

const STATUS_BADGE: Record<DayStatus, BadgeVariant> = {
  published: 'success',
  draft: 'warning',
  empty: 'outline'
};

const COLUMN_WIDTHS: React.CSSProperties[] = [{ width: '72px' }, {}, { width: '128px' }, { width: '152px' }, { width: '104px' }];

const importStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 220px', minWidth: '160px', maxWidth: '360px' };

export const PublicationsTab: React.FC<IPublicationsTabProps> = ({ services, defaultYear, createSignal, notify }) => {
  const [filters, setFilters] = React.useState<IPublicationFiltersState>({ year: defaultYear, status: 'all', search: '' });
  const [editor, setEditor] = React.useState<EditorState>(undefined);
  const [toDelete, setToDelete] = React.useState<IPublication | undefined>(undefined);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
  const [isConfirmingImport, setIsConfirmingImport] = React.useState<boolean>(false);
  const [importProgress, setImportProgress] = React.useState<{ done: number; total: number } | undefined>(undefined);

  const year = filters.year;
  const publications = useAsyncData<IPublication[]>(() => services.publications.getByYear(year, false), [services, year]);

  const rows = React.useMemo<IDayRow[]>(() => {
    const byDay = new Map<number, IPublication>((publications.data ?? []).map((publication) => [publication.day, publication]));
    return Array.from({ length: 24 }, (_, index) => {
      const publication = byDay.get(index + 1);
      const status: DayStatus = !publication ? 'empty' : publication.published ? 'published' : 'draft';
      return { day: index + 1, status, publication };
    });
  }, [publications.data]);

  const counts = React.useMemo<Record<DayStatus, number>>(() => {
    const result: Record<DayStatus, number> = { published: 0, draft: 0, empty: 0 };
    rows.forEach((row) => { result[row.status]++; });
    return result;
  }, [rows]);

  const visibleRows = React.useMemo(() => {
    const query = normalizeSearch(filters.search.trim());
    return rows.filter((row) =>
      (filters.status === 'all' || filters.status === row.status)
      && (!query || normalizeSearch(row.publication?.title ?? '').indexOf(query) !== -1 || String(row.day) === query));
  }, [rows, filters]);

  const usedDays = React.useMemo(() => new Set((publications.data ?? []).map((publication) => publication.day)), [publications.data]);
  const years = React.useMemo(() => [defaultYear - 1, defaultYear, defaultYear + 1, defaultYear + 2], [defaultYear]);

  // Bouton « Nouvelle publication » de la barre de titre : premier jour libre.
  const handledSignal = React.useRef<number>(0);
  React.useEffect(() => {
    if (createSignal === 0) {
      handledSignal.current = 0;
      return;
    }
    // Attend la fin du chargement : sinon tous les jours paraissent libres. Un signal n'est traité qu'une fois.
    if (createSignal > 0 && createSignal !== handledSignal.current && !publications.isLoading && publications.data) {
      handledSignal.current = createSignal;
      const firstFree = rows.find((row) => !row.publication)?.day;
      if (firstFree === undefined) {
        notify({ intent: 'error', title: strings.AllDaysUsed });
      } else {
        setEditor({ day: firstFree, publication: undefined });
      }
    }
    // Réagit au clic sur le bouton, ou à la fin du chargement s'il a eu lieu pendant celui-ci.
  }, [createSignal, publications.isLoading, publications.data]);

  const handleSave = async (input: IPublicationInput, id: number | undefined): Promise<void> => {
    await services.publications.save(input, id);
    setEditor(undefined);
    notify({ intent: 'success', title: format(strings.PublicationSaved, input.day) });
    publications.reload();
  };

  const confirmDelete = async (): Promise<void> => {
    if (!toDelete) {
      return;
    }
    setIsDeleting(true);
    try {
      await services.publications.remove(toDelete.id);
      notify({ intent: 'success', title: format(strings.PublicationDeleted, toDelete.day) });
      publications.reload();
    } catch (error) {
      notify({ intent: 'error', title: strings.ErrorDeleteTitle, body: getErrorMessage(error) });
    } finally {
      setIsDeleting(false);
      setToDelete(undefined);
    }
  };

  const openRow = (row: IDayRow): void => setEditor({ day: row.day, publication: row.publication });

  // Contenu de démonstration : proposé à l'import tant que l'édition affichée de la liste est vide.
  const canImportDemo = !publications.isLoading && !!publications.data && publications.data.length === 0;

  const runImport = async (): Promise<void> => {
    setIsConfirmingImport(false);
    setImportProgress({ done: 0, total: 24 });
    try {
      const result = await services.defaultContent.importDemo(year, (done, total) => setImportProgress({ done, total }));
      notify({
        intent: 'success',
        title: formatCount(result.created, strings.ImportDoneOne, strings.ImportDoneOther, result.created)
      });
      if (result.imagesFailed > 0) {
        notify({
          intent: 'error',
          title: formatCount(result.imagesFailed, strings.ImportImagesFailedOne, strings.ImportImagesFailedOther, result.imagesFailed),
          body: result.imageError
        });
      }
    } catch (error) {
      notify({ intent: 'error', title: strings.ErrorActionTitle, body: getErrorMessage(error) });
    } finally {
      setImportProgress(undefined);
      publications.reload();
    }
  };

  return (
    <>
      <div className="adv-main adv-main--narrow">
        <div className="ac-page-head">
          <h2 className="ac-page-title">{strings.TabPublications}</h2>
          <p className="ac-page-desc">{strings.PublicationsIntro}</p>
        </div>

        <PublicationFilters
          filters={filters}
          years={years}
          counts={counts}
          resultCount={visibleRows.length}
          onChange={setFilters}
        />

        {publications.error && (
          <StatusMessage tone="error" message={format(strings.ErrorLoadingPublications, publications.error)} onRetry={publications.reload} />
        )}

        {(canImportDemo || importProgress) && (
          <section className="ac-card">
            <div className="ac-card-header">
              <h3 className="ac-card-title">{strings.ImportTitle}</h3>
              <p className="ac-card-desc">{format(strings.ImportDescription, year)}</p>
            </div>
            <div className="ac-card-content">
              <div style={a.row}>
                <button
                  type="button"
                  className="ac-btn ac-btn-primary"
                  disabled={!!importProgress}
                  aria-busy={!!importProgress}
                  onClick={() => setIsConfirmingImport(true)}
                >
                  <Icon name="gift" size={16} />
                  {strings.ImportButton}
                </button>
                {importProgress && (
                  <div style={importStyle}>
                    <div
                      className="ac-progress"
                      role="progressbar"
                      aria-label={strings.ImportTitle}
                      aria-valuemin={0}
                      aria-valuemax={importProgress.total}
                      aria-valuenow={importProgress.done}
                    >
                      <div className="ac-progress-bar" style={{ width: `${(importProgress.done / Math.max(1, importProgress.total)) * 100}%` }} />
                    </div>
                    <span className="ac-muted ac-tabular">{format(strings.ImportProgress, importProgress.done, importProgress.total)}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {publications.isLoading ? (
          <Loader label={strings.Loading} shape="table" />
        ) : visibleRows.length === 0 ? (
          <div className="ac-card">
            <EmptyState
              icon="search"
              title={strings.NoResult}
              description={strings.NoResultHint}
              action={hasActiveFilters(filters) ? (
                <button
                  type="button"
                  className="ac-btn ac-btn-outline ac-btn-sm"
                  onClick={() => setFilters(resetFilters(filters))}
                >
                  <Icon name="reset" size={14} />
                  {strings.Reset}
                </button>
              ) : undefined}
            />
          </div>
        ) : (
          <div className="ac-card ac-card-clip adv-table-wrap">
            <table className="ac-table adv-table" aria-label={format(strings.PublicationsGridAriaLabel, year)}>
              <colgroup>{COLUMN_WIDTHS.map((width, index) => <col key={index} style={width} />)}</colgroup>
              <thead>
                <tr>
                  <th>{strings.ColumnDay}</th>
                  <th>{strings.ColumnTitle}</th>
                  <th>{strings.ColumnUnlockDate}</th>
                  <th>{strings.ColumnStatus}</th>
                  <th style={{ textAlign: 'right' }}>{strings.ColumnActions}</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={row.day}
                    className="ac-row"
                    tabIndex={0}
                    onClick={() => openRow(row)}
                    onKeyDown={(event) => {
                      // Entrée sur un bouton de la ligne ne doit pas aussi ouvrir le formulaire.
                      if (event.target !== event.currentTarget) {
                        return;
                      }
                      if (event.key === 'Enter') {
                        openRow(row);
                      }
                    }}
                  >
                    <td className="ac-table-num">{row.day}</td>
                    <td className="ac-nowrap-ellipsis">
                      {row.publication?.title ?? <span className="ac-muted">—</span>}
                    </td>
                    <td className="ac-tabular">{row.publication ? formatShortDate(effectiveUnlockDate(row.publication)) : ''}</td>
                    <td><Badge variant={STATUS_BADGE[row.status]} dot>{STATUS_LABELS[row.status]}</Badge></td>
                    <td>
                      <div className="ac-table-actions">
                        {row.publication ? (
                          <>
                            <button
                              type="button"
                              className="ac-icon-btn"
                              title={strings.Edit}
                              aria-label={format(strings.EditDayAriaLabel, row.day)}
                              onClick={(event) => { event.stopPropagation(); openRow(row); }}
                            >
                              <Icon name="edit" size={16} />
                            </button>
                            <button
                              type="button"
                              className="ac-icon-btn"
                              title={strings.Delete}
                              aria-label={format(strings.DeleteDayAriaLabel, row.day)}
                              onClick={(event) => { event.stopPropagation(); setToDelete(row.publication); }}
                            >
                              <Icon name="trash" size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="ac-icon-btn"
                            title={format(strings.CreateForDay, row.day)}
                            aria-label={format(strings.CreateForDay, row.day)}
                            onClick={(event) => { event.stopPropagation(); openRow(row); }}
                          >
                            <Icon name="add" size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editor && (
        <PublicationFormModal
          services={services}
          year={year}
          publication={editor.publication}
          initialDay={editor.day}
          usedDays={usedDays}
          onSave={handleSave}
          onCancel={() => setEditor(undefined)}
        />
      )}

      <ConfirmModal
        open={isConfirmingImport}
        title={strings.ImportTitle}
        message={format(strings.ImportConfirm, year)}
        confirmLabel={strings.ImportButton}
        onConfirm={() => { runImport().catch(() => undefined); }}
        onCancel={() => setIsConfirmingImport(false)}
      />

      <ConfirmModal
        open={!!toDelete}
        title={strings.DeleteConfirmTitle}
        message={toDelete ? format(strings.DeleteConfirmText, toDelete.day, toDelete.title) : ''}
        confirmLabel={strings.Delete}
        danger
        busy={isDeleting}
        onConfirm={() => { confirmDelete().catch(() => undefined); }}
        onCancel={() => setToDelete(undefined)}
      />
    </>
  );
};
