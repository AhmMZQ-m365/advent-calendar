import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import styles from '../AdventCalendar.module.scss';
import { ToolHeader } from '../common/ToolHeader';
import { StatusMessage } from '../common/StatusMessage';
import { Loader } from '../common/Loader';
import { CalendarGrid } from './CalendarGrid';
import { CalendarHeader } from './CalendarHeader';
import { PublicationDrawer } from './PublicationDrawer';
import { SnowEffect } from './SnowEffect';
import { TreeScene } from './TreeScene';
import { CalendarLegend } from './CalendarLegend';
import { buildDoors, countByState, IDoorModel } from './calendarModel';
import { useAsyncData } from '../../hooks/useAsyncData';
import { ICalendarBootstrap } from '../../hooks/useCalendarBootstrap';
import { IAdventServices } from '../../services/AdventServices';
import { DEFAULT_THEME, IThemeProfile } from '../../models/IThemeProfile';
import { IPublication } from '../../models/IPublication';
import { CalendarLayout } from '../IAdventCalendarProps';
import { buildDemoPublications } from '../../defaults/demo/demoContent';
import { ensureFontFace, getThemeCssVariables } from '../../services/ThemeService';
import { format, formatCount } from '../../services/format';
import { formatShortDate } from '../../services/dateUtils';
import { Icon } from '../../theme/Icons';

export interface ICalendarScreenProps {
  services: IAdventServices;
  bootstrap: ICalendarBootstrap;
  onRetryBootstrap: () => void;
  year: number;
  today: Date;
  isDateSimulated: boolean;
  themeProfileId: number | undefined;
  layout: CalendarLayout;
  onOpenAdmin: () => void;
}

/**
 * Écran « lecteur » : barre de titre + calendrier, en présentation « Sapin » (par défaut) ou « Grille ».
 * Tant que la liste ne contient aucune publication publiée pour l'édition affichée, le contenu de
 * démonstration (defaults/demo/demoContent.ts) est affiché.
 */
export const CalendarScreen: React.FC<ICalendarScreenProps> = (props) => {
  const { services, bootstrap, onRetryBootstrap, year, today, isDateSimulated, themeProfileId, layout, onOpenAdmin } = props;
  const isReady = bootstrap.provisioning.state !== 'blocked';

  const theme = useAsyncData<IThemeProfile | undefined>(
    () => services.settings.resolve(themeProfileId),
    [services, themeProfileId],
    isReady
  );
  const publications = useAsyncData<IPublication[]>(
    () => services.publications.getByYear(year, true),
    [services, year],
    isReady
  );

  const userId = bootstrap.permissions.userId;
  // Consultations enregistrées dans SharePoint (liste AdventViews) : seule référence pour le badge « Déjà consulté ».
  const serverViews = useAsyncData<Set<number>>(
    () => services.views.getViewedDays(year, userId),
    [services, year, userId],
    isReady
  );

  const [localDays, setLocalDays] = React.useState<Set<number>>(() => services.openedDays.getOpenedDays(year));
  const [savedDays, setSavedDays] = React.useState<Set<number>>(new Set<number>());
  const [isSyncFailed, setIsSyncFailed] = React.useState<boolean>(false);
  const [selected, setSelected] = React.useState<IPublication | undefined>(undefined);
  const [hiddenNotices, setHiddenNotices] = React.useState<Set<string>>(new Set<string>());

  // Jours enregistrés ou en cours d'enregistrement pendant la session : un seul appel par jour.
  const sentDays = React.useRef<Set<number>>(new Set<number>());
  React.useEffect(() => {
    setLocalDays(services.openedDays.getOpenedDays(year));
    setSavedDays(new Set<number>());
    sentDays.current = new Set<number>();
  }, [services, year]);

  // Jours consultés : la liste SharePoint fait foi (+ jours enregistrés avec succès pendant la session).
  // Le cache local du navigateur n'est utilisé qu'en repli, si la liste ne peut pas être lue.
  const isViewsFallback = !!serverViews.error;
  const openedDays = React.useMemo(() => {
    const all = new Set<number>(isViewsFallback ? localDays : serverViews.data);
    savedDays.forEach((day) => all.add(day));
    return all;
  }, [isViewsFallback, localDays, serverViews.data, savedDays]);

  const activeTheme: IThemeProfile = theme.data ?? DEFAULT_THEME;
  // Police du profil (fichier seulement) ; retirée quand le profil change ou que l'écran disparaît.
  React.useEffect(
    () => ensureFontFace(activeTheme.fontUrl, activeTheme.fontFamily),
    [activeTheme.fontUrl, activeTheme.fontFamily]
  );

  const themeStyle = React.useMemo(() => getThemeCssVariables(activeTheme) as React.CSSProperties, [activeTheme]);

  // Contenu de démonstration : seulement si la liste ne contient aucune publication publiée pour l'édition.
  const isDemo = !!publications.data && publications.data.length === 0;
  const effectivePublications = React.useMemo(
    () => (isDemo ? buildDemoPublications(year, services.language) : publications.data ?? []),
    [isDemo, year, services.language, publications.data]
  );

  const doors = React.useMemo(
    () => buildDoors(effectivePublications, year, today, openedDays),
    [effectivePublications, year, today, openedDays]
  );

  const serverDays = serverViews.data;
  const handleOpen = React.useCallback((door: IDoorModel): void => {
    setLocalDays(services.openedDays.markOpened(year, door.day));
    setSelected(door.publication);
    // Contenu de démonstration (id négatif) : pas de consultation enregistrée en liste (le cache local suffit).
    const isDemoDoor = !!door.publication && door.publication.id < 0;
    if (!isDemoDoor && !serverDays?.has(door.day) && !sentDays.current.has(door.day)) {
      sentDays.current.add(door.day);
      services.views.markViewed(year, door.day, userId)
        .then(() => setSavedDays((current) => new Set(current).add(door.day)))
        .catch(() => {
          sentDays.current.delete(door.day);
          setIsSyncFailed(true);
        });
    }
  }, [services, year, userId, serverDays]);

  const hideNotice = (key: string): void => setHiddenNotices((current) => new Set(current).add(key));

  const provisioning = bootstrap.provisioning;
  const provisioningDetails = provisioning.missingLists.concat(provisioning.missingFields);
  // On attend aussi la lecture des consultations : pas de badge qui apparaît après coup.
  const isContentLoading = isReady && (theme.isLoading || publications.isLoading || serverViews.isLoading);
  const openedCount = countByState(doors, 'opened');
  const showCalendar = isReady && !isContentLoading && !publications.error;

  return (
    <>
      <ToolHeader
        title={activeTheme.headerTitle || format(strings.DefaultHeaderTitle, year)}
        subtitle={isReady && !isContentLoading ? formatCount(openedCount, strings.CalendarSubtitleOne, strings.CalendarSubtitleOther, year, openedCount) : undefined}
        showLogo
        actions={bootstrap.isAdmin && isReady ? (
          <button type="button" className="ac-btn ac-btn-outline" onClick={onOpenAdmin}>
            <Icon name="edit" size={16} />
            {strings.AdminButton}
          </button>
        ) : undefined}
      />

      <div className="adv-main" style={themeStyle}>
        {isDateSimulated && (
          <StatusMessage tone="warning" message={format(strings.TestModeBanner, formatShortDate(today))} />
        )}
        {provisioning.state === 'blocked' && (
          <StatusMessage tone="error" message={strings.ProvisioningBlocked} details={provisioningDetails} onRetry={onRetryBootstrap} />
        )}
        {provisioning.state === 'repaired' && !hiddenNotices.has('repaired') && (
          <StatusMessage tone="success" message={strings.ProvisioningRepaired} details={provisioningDetails} onDismiss={() => hideNotice('repaired')} />
        )}
        {provisioning.warnings.length > 0 && !hiddenNotices.has('warnings') && (
          <StatusMessage tone="warning" message={strings.ProvisioningWarnings} details={provisioning.warnings} onDismiss={() => hideNotice('warnings')} />
        )}
        {theme.error && (
          <StatusMessage tone="warning" message={format(strings.ErrorLoadingTheme, theme.error)} onRetry={theme.reload} />
        )}
        {publications.error && (
          <StatusMessage tone="error" message={format(strings.ErrorLoadingPublications, publications.error)} onRetry={publications.reload} />
        )}
        {isViewsFallback && !hiddenNotices.has('viewsRead') && (
          <StatusMessage tone="warning" message={strings.ViewsReadFailed} onRetry={serverViews.reload} onDismiss={() => hideNotice('viewsRead')} />
        )}
        {isSyncFailed && !hiddenNotices.has('sync') && (
          <StatusMessage tone="warning" message={strings.ViewsSyncFailed} onDismiss={() => hideNotice('sync')} />
        )}
        {bootstrap.isAdmin && isDemo && !hiddenNotices.has('demo') && (
          <StatusMessage tone="info" message={format(strings.DemoContentNotice, year)} onDismiss={() => hideNotice('demo')} />
        )}

        {isContentLoading && <Loader label={strings.LoadingCalendar} shape="calendar" />}

        {showCalendar && (
          <div className="ac-card ac-card-clip adv-calendar-surface">
            {layout === 'tree' ? (
              <section className={`${styles.adventCalendar} ${styles.adventCalendarTree}`}>
                <div className={styles.treeSceneWrap}>
                  <TreeScene doors={doors} year={year} theme={activeTheme} onOpen={handleOpen} />
                </div>
              </section>
            ) : (
              <section className={styles.adventCalendar}>
                {activeTheme.snowEffect && <SnowEffect />}
                <CalendarHeader year={year} opened={openedCount} total={doors.length} logoUrl={activeTheme.logoUrl} />
                <CalendarGrid doors={doors} onOpen={handleOpen} />
              </section>
            )}
          </div>
        )}

        {showCalendar && <CalendarLegend doors={doors} />}

        <PublicationDrawer publication={selected} onClose={() => setSelected(undefined)} />
      </div>
    </>
  );
};
