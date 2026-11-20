import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { ToolHeader } from '../common/ToolHeader';
import { NotifyFn } from '../common/Toasts';
import { nextRovingIndex } from '../common/focus';
import { useFieldId } from '../../hooks/useFieldId';
import { IAdventServices } from '../../services/AdventServices';
import { Icon, IconName } from '../../theme/Icons';
import { PublicationsTab } from './PublicationsTab';
import { SettingsTab } from './SettingsTab';
import { AdminsTab } from './AdminsTab';

export interface IAdminScreenProps {
  services: IAdventServices;
  year: number;
  currentUserId: number;
  isSiteOwner: boolean;
  notify: NotifyFn;
  onBack: () => void;
}

type AdminTab = 'publications' | 'settings' | 'admins';

const TABS: { key: AdminTab; label: string; icon: IconName }[] = [
  { key: 'publications', label: strings.TabPublications, icon: 'calendar' },
  { key: 'settings', label: strings.TabSettings, icon: 'sparkles' },
  { key: 'admins', label: strings.TabAdmins, icon: 'users' }
];

const panelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 };
const actionsStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px' };

/** Écran d'administration : barre du haut avec onglets (Tabs), contenu de l'onglet actif. */
export const AdminScreen: React.FC<IAdminScreenProps> = ({ services, year, currentUserId, isSiteOwner, notify, onBack }) => {
  const [tab, setTab] = React.useState<AdminTab>('publications');
  // Incrémenté par le bouton de création de la barre de titre : l'onglet actif ouvre son formulaire.
  const [createSignal, setCreateSignal] = React.useState<number>(0);
  const tabRefs = React.useRef<Array<HTMLButtonElement | undefined>>([]);
  const baseId = useFieldId('adv-admin');

  const createLabel = tab === 'publications' ? strings.NewPublication : tab === 'settings' ? strings.NewProfile : undefined;

  const selectTab = (key: AdminTab): void => {
    setTab(key);
    setCreateSignal(0);
  };

  // Clavier des onglets : flèches gauche / droite, Début, Fin (l'onglet suit le focus).
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const next = nextRovingIndex(event.key, index, TABS.length, 'horizontal');
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    selectTab(TABS[next].key);
    const target = tabRefs.current[next];
    if (target) {
      target.focus();
    }
  };

  return (
    <>
      <ToolHeader
        title={strings.AdminPanelTitle}
        showLogo
        actions={
          <div style={actionsStyle}>
            <button type="button" className="ac-btn ac-btn-ghost" onClick={onBack}>
              <Icon name="arrow-left" size={16} />
              {strings.BackToCalendar}
            </button>
            {createLabel && (
              <button type="button" className="ac-btn ac-btn-primary" onClick={() => setCreateSignal((value) => value + 1)}>
                <Icon name="add" size={16} />
                {createLabel}
              </button>
            )}
          </div>
        }
      >
        <div className="ac-tabs" role="tablist">
          {TABS.map((item, index) => (
            <button
              key={item.key}
              ref={(element) => { tabRefs.current[index] = element ?? undefined; }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.key}`}
              aria-selected={tab === item.key}
              aria-controls={`${baseId}-panel`}
              tabIndex={tab === item.key ? 0 : -1}
              className="ac-tab"
              onClick={() => selectTab(item.key)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </div>
      </ToolHeader>

      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${tab}`} style={panelStyle}>
        {tab === 'publications' && (
          <PublicationsTab services={services} defaultYear={year} createSignal={createSignal} notify={notify} />
        )}
        {tab === 'settings' && <SettingsTab services={services} createSignal={createSignal} notify={notify} />}
        {tab === 'admins' && (
          <AdminsTab services={services} currentUserId={currentUserId} isSiteOwner={isSiteOwner} notify={notify} />
        )}
      </div>
    </>
  );
};
