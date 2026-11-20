import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { IAdventServices } from '../../services/AdventServices';
import { IThemeProfile, profileFromPreset } from '../../models/IThemeProfile';
import { IThemePreset } from '../../defaults/themes/themePresets';
import { useAsyncData } from '../../hooks/useAsyncData';
import { format, getErrorMessage } from '../../services/format';
import { TOKENS } from '../../theme/tokens';
import { StatusMessage } from '../common/StatusMessage';
import { Loader } from '../common/Loader';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ConfirmModal } from '../common/ConfirmModal';
import { Modal } from '../common/Modal';
import { NotifyFn } from '../common/Toasts';
import { TreeThumbnail } from '../calendar/TreeThumbnail';
import { ThemeProfileModal } from './ThemeProfileModal';
import { ThemePresetPicker } from './ThemePresetPicker';

export interface ISettingsTabProps {
  services: IAdventServices;
  /** Incrémenté par le bouton « Nouveau profil » de la barre de titre. */
  createSignal: number;
  notify: NotifyFn;
}

const s: Record<string, React.CSSProperties> = {
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' },
  thumb: { display: 'block', overflow: 'hidden', borderRadius: '8px', border: `1px solid ${TOKENS.border}` },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minWidth: 0 },
  cardTitle: { fontSize: '14px', fontWeight: 600, minWidth: 0 }
};

/** Profils de thème : une carte par profil ; création / modification dans une pop-up avec aperçu. */
export const SettingsTab: React.FC<ISettingsTabProps> = ({ services, createSignal, notify }) => {
  const profiles = useAsyncData<IThemeProfile[]>(() => services.settings.getAll(), [services]);
  const [editing, setEditing] = React.useState<IThemeProfile | undefined>(undefined);
  const [toDelete, setToDelete] = React.useState<IThemeProfile | undefined>(undefined);
  const [isBusy, setIsBusy] = React.useState<boolean>(false);
  const [isPicking, setIsPicking] = React.useState<boolean>(false);

  // « Nouveau profil » : on choisit d'abord un modèle de départ (couleurs, sapin, décor, neige), puis on l'ajuste.
  React.useEffect(() => {
    if (createSignal > 0) {
      setIsPicking(true);
    }
  }, [createSignal]);

  const handlePickPreset = (preset: IThemePreset): void => {
    setIsPicking(false);
    setEditing(profileFromPreset(preset));
  };

  /** Exécute une action, affiche un toast, recharge la liste ; renvoie true si elle a réussi. */
  const run = async (action: () => Promise<string>): Promise<boolean> => {
    setIsBusy(true);
    try {
      notify({ intent: 'success', title: await action() });
      profiles.reload();
      return true;
    } catch (error) {
      notify({ intent: 'error', title: strings.ErrorActionTitle, body: getErrorMessage(error) });
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const handleSave = (profile: IThemeProfile): void => {
    run(async () => {
      await services.settings.save(profile);
      return format(strings.ProfileSaved, profile.title);
    }).then((ok) => { if (ok) { setEditing(undefined); } }).catch(() => undefined);
  };

  const handleActivate = (profile: IThemeProfile): void => {
    if (profile.id === undefined) {
      return;
    }
    const id = profile.id;
    run(async () => {
      await services.settings.setActive(id);
      return format(strings.ProfileActivated, profile.title);
    }).then((ok) => { if (ok) { setEditing(undefined); } }).catch(() => undefined);
  };

  const confirmDelete = (): void => {
    const profile = toDelete;
    if (!profile || profile.id === undefined) {
      return;
    }
    const id = profile.id;
    run(async () => {
      await services.settings.remove(id);
      return format(strings.ProfileDeleted, profile.title);
    }).then(() => {
      setToDelete(undefined);
      setEditing(undefined);
    }).catch(() => undefined);
  };

  return (
    <div className="adv-main adv-main--narrow">
      <div className="ac-page-head">
        <h2 className="ac-page-title">{strings.TabSettings}</h2>
        <p className="ac-page-desc">{strings.SettingsIntro}</p>
      </div>

      {profiles.error && (
        <StatusMessage tone="error" message={format(strings.ErrorLoadingProfiles, profiles.error)} onRetry={profiles.reload} />
      )}
      {profiles.isLoading && !profiles.data && <Loader label={strings.Loading} />}
      {profiles.data && profiles.data.length === 0 && (
        <EmptyState bordered icon="sparkles" title={strings.NoProfileTitle} description={strings.NoProfile} />
      )}

      {profiles.data && profiles.data.length > 0 && (
        <div style={s.cards}>
          {profiles.data.map((profile) => (
            <button key={profile.id} type="button" className="ac-card ac-card-interactive" onClick={() => setEditing(profile)}>
              <span style={s.thumb}>
                <TreeThumbnail profile={profile} />
              </span>
              <span style={s.cardHead}>
                <span className="ac-nowrap-ellipsis" style={s.cardTitle}>{profile.title}</span>
                {profile.isActive && <Badge variant="success" dot>{strings.ProfileIsActive}</Badge>}
              </span>
              {profile.headerTitle && <span className="ac-nowrap-ellipsis ac-muted">{profile.headerTitle}</span>}
            </button>
          ))}
        </div>
      )}

      {editing && (
        <ThemeProfileModal
          services={services}
          profile={editing}
          isBusy={isBusy}
          onSave={handleSave}
          onActivate={handleActivate}
          onDelete={(profile) => setToDelete(profile)}
          onClose={() => setEditing(undefined)}
        />
      )}

      <Modal open={isPicking} onClose={() => setIsPicking(false)} title={strings.NewProfilePickerTitle} subtitle={strings.PresetPickerIntro} width="980px">
        {isPicking && <ThemePresetPicker onSelect={handlePickPreset} />}
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        title={strings.DeleteProfileConfirmTitle}
        message={toDelete ? format(strings.DeleteProfileConfirmText, toDelete.title) : ''}
        confirmLabel={strings.Delete}
        danger
        busy={isBusy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(undefined)}
      />
    </div>
  );
};
