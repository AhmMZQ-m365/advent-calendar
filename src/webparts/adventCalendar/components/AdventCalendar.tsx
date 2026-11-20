import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { IAdventCalendarProps } from './IAdventCalendarProps';
import { CalendarScreen } from './calendar/CalendarScreen';
import { ToolHeader } from './common/ToolHeader';
import { ErrorBoundary } from './common/ErrorBoundary';
import { StatusMessage } from './common/StatusMessage';
import { Loader } from './common/Loader';
import { Toasts, useToasts } from './common/Toasts';
import { useCalendarBootstrap } from '../hooks/useCalendarBootstrap';
import { format } from '../services/format';
import { GLOBAL_CSS } from '../theme/globalStyles';
import { RESPONSIVE_CSS } from '../theme/responsiveStyles';
import { TOKENS } from '../theme/tokens';

// Chargé à la demande (chunk séparé) : les lecteurs ne téléchargent pas l'interface d'administration.
const createAdminScreen = (): React.LazyExoticComponent<typeof import('./admin/AdminScreen').AdminScreen> => React.lazy(() =>
  import(/* webpackChunkName: 'advent-calendar-admin' */ './admin/AdminScreen').then((module) => ({ default: module.AdminScreen }))
);

type View = 'calendar' | 'admin';

const s: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0, backgroundColor: TOKENS.background }
};

/**
 * Racine du web part : `ac-root` porte les variables --ac-*, `ac-theme` applique la police et la couleur de texte,
 * GLOBAL_CSS est injecté une seule fois.
 * Deux écrans : le calendrier (lecteurs) et l'administration (chargée à la demande).
 */
const AdventCalendar: React.FC<IAdventCalendarProps> = (props) => {
  const { services, year, adminYear, today, isDateSimulated, themeProfileId, layout } = props;
  const bootstrap = useCalendarBootstrap(services);
  const [view, setView] = React.useState<View>('calendar');
  const { toasts, notify, dismiss } = useToasts();
  // Nouvelle tentative de chargement du chunk d'administration : un React.lazy déjà rejeté ne se relance pas.
  const [adminAttempt, setAdminAttempt] = React.useState<number>(0);
  const AdminScreen = React.useMemo(createAdminScreen, [adminAttempt]);

  const header = <ToolHeader title={format(strings.DefaultHeaderTitle, year)} showLogo />;

  const renderContent = (): React.ReactNode => {
    if (bootstrap.isLoading) {
      return (
        <>
          {header}
          <div className="adv-main"><Loader label={strings.LoadingCalendar} shape="calendar" /></div>
        </>
      );
    }
    if (bootstrap.error || !bootstrap.data) {
      return (
        <>
          {header}
          <div className="adv-main">
            <StatusMessage
              tone="error"
              message={format(strings.ErrorBootstrap, bootstrap.error ?? strings.UnknownError)}
              onRetry={bootstrap.reload}
            />
          </div>
        </>
      );
    }
    if (view === 'admin' && bootstrap.data.isAdmin) {
      return (
        <ErrorBoundary
          fallback={(error, reset) => (
            <>
              {header}
              <div className="adv-main">
                <StatusMessage
                  tone="error"
                  message={format(strings.ErrorBootstrap, error.message || strings.UnknownError)}
                  onRetry={() => { setAdminAttempt((value) => value + 1); reset(); }}
                />
                <div>
                  <button type="button" className="ac-btn ac-btn-outline" onClick={() => setView('calendar')}>
                    {strings.BackToCalendar}
                  </button>
                </div>
              </div>
            </>
          )}
        >
          <React.Suspense fallback={<div className="adv-main"><Loader label={strings.Loading} /></div>}>
            <AdminScreen
              services={services}
              year={adminYear}
              currentUserId={bootstrap.data.permissions.userId}
              isSiteOwner={bootstrap.data.permissions.isSiteOwner}
              notify={notify}
              onBack={() => setView('calendar')}
            />
          </React.Suspense>
        </ErrorBoundary>
      );
    }
    // Revenir de l'administration remonte l'écran calendrier : thème et publications sont rechargés.
    return (
      <CalendarScreen
        services={services}
        bootstrap={bootstrap.data}
        onRetryBootstrap={bootstrap.reload}
        year={year}
        today={today}
        isDateSimulated={isDateSimulated}
        themeProfileId={themeProfileId}
        layout={layout}
        onOpenAdmin={() => setView('admin')}
      />
    );
  };

  return (
    <div className="ac-root ac-theme adv-app" style={s.root}>
      <style>{GLOBAL_CSS + RESPONSIVE_CSS}</style>
      {renderContent()}
      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  );
};

export default AdventCalendar;
