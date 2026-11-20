import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { IAdventServices } from '../../services/AdventServices';
import { IAdmin, IUserSuggestion } from '../../models/IAdmin';
import { IListSecurityStatus } from '../../services/SecurityService';
import { localize } from '../../models/ILocalizedText';
import { useAsyncData } from '../../hooks/useAsyncData';
import { format, getErrorMessage } from '../../services/format';
import { TOKENS } from '../../theme/tokens';
import { Icon } from '../../theme/Icons';
import { StatusMessage } from '../common/StatusMessage';
import { Loader } from '../common/Loader';
import { ConfirmModal } from '../common/ConfirmModal';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { NotifyFn } from '../common/Toasts';
import { UserPicker } from './UserPicker';
import { FormField } from './FormField';
import { useFieldId } from '../../hooks/useFieldId';
import { a } from '../common/layoutStyles';

export interface IAdminsTabProps {
  services: IAdventServices;
  currentUserId: number;
  isSiteOwner: boolean;
  notify: NotifyFn;
}

const s: Record<string, React.CSSProperties> = {
  addRow: { display: 'flex', alignItems: 'flex-end', gap: '8px', flexWrap: 'wrap', maxWidth: '640px' },
  person: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 },
  securityList: { listStyle: 'none', margin: 0, padding: 0 },
  securityItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '12px 16px', fontSize: '14px' }
};

export const AdminsTab: React.FC<IAdminsTabProps> = ({ services, currentUserId, isSiteOwner, notify }) => {
  const admins = useAsyncData<IAdmin[]>(() => services.admins.getAll(), [services]);
  const security = useAsyncData<IListSecurityStatus[]>(() => services.security.getStatus(), [services]);
  const [candidate, setCandidate] = React.useState<IUserSuggestion | undefined>(undefined);
  const [toRemove, setToRemove] = React.useState<IAdmin | undefined>(undefined);
  const [isConfirmingSecurity, setIsConfirmingSecurity] = React.useState<boolean>(false);
  const [isBusy, setIsBusy] = React.useState<boolean>(false);
  const pickerId = useFieldId('adv-admin-picker');

  const isSecured = (security.data ?? []).some((status) => status.hasUniquePermissions);

  /** Relit les administrateurs puis réapplique les droits des listes. */
  const applyCurrentSecurity = async (): Promise<void> => {
    const current = await services.admins.getAll();
    await services.security.applySecurity(current.map((admin) => admin.userId), currentUserId);
  };

  /** Réapplique les droits si les listes sont déjà sécurisées, pour refléter la nouvelle liste d'administrateurs. */
  const syncSecurity = async (): Promise<string | undefined> => {
    if (!isSecured) {
      return undefined;
    }
    if (!isSiteOwner) {
      return strings.SecurityResyncNeedsOwner;
    }
    await applyCurrentSecurity();
    return strings.SecurityResynced;
  };

  const run = async (action: () => Promise<string>): Promise<void> => {
    setIsBusy(true);
    try {
      const message = await action();
      const syncMessage = await syncSecurity();
      notify({ intent: 'success', title: message, body: syncMessage });
    } catch (error) {
      notify({ intent: 'error', title: strings.ErrorActionTitle, body: getErrorMessage(error) });
    } finally {
      setIsBusy(false);
      admins.reload();
      security.reload();
    }
  };

  const handleAdd = (): void => {
    const user = candidate;
    if (!user) {
      return;
    }
    run(async () => {
      await services.admins.add(user);
      setCandidate(undefined);
      return format(strings.AdminAdded, user.displayName);
    }).catch(() => undefined);
  };

  const handleRemove = (): void => {
    const admin = toRemove;
    setToRemove(undefined);
    if (!admin) {
      return;
    }
    run(async () => {
      await services.admins.remove(admin.itemId);
      return format(strings.AdminRemoved, admin.displayName);
    }).catch(() => undefined);
  };

  const handleSecure = (): void => {
    setIsConfirmingSecurity(false);
    setIsBusy(true);
    applyCurrentSecurity()
      .then(() => notify({ intent: 'success', title: strings.SecurityApplied }))
      .catch((error: unknown) => notify({ intent: 'error', title: strings.ErrorActionTitle, body: format(strings.SecurityFailed, getErrorMessage(error)) }))
      .finally(() => {
        setIsBusy(false);
        security.reload();
      });
  };

  return (
    <div className="adv-main adv-main--narrow">
      <div className="ac-page-head">
        <h2 className="ac-page-title">{strings.TabAdmins}</h2>
      </div>

      <section className="ac-card">
        <div className="ac-card-header">
          <h3 className="ac-card-title">{strings.AdminsSectionTitle}</h3>
          <p className="ac-card-desc">{strings.AdminsSectionDescription}</p>
        </div>
        <div className="ac-card-content">
          <div style={s.addRow}>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <FormField label={strings.AddAdminLabel} htmlFor={pickerId}>
                <UserPicker services={services} inputId={pickerId} selected={candidate} disabled={isBusy} onChange={setCandidate} />
              </FormField>
            </div>
            <button type="button" className="ac-btn ac-btn-primary" disabled={!candidate || isBusy} onClick={handleAdd}>
              <Icon name="add" size={16} />
              {strings.Add}
            </button>
          </div>

          {admins.error && (
            <StatusMessage tone="error" message={format(strings.ErrorLoadingAdmins, admins.error)} onRetry={admins.reload} />
          )}
          {admins.isLoading && !admins.data && <Loader label={strings.Loading} shape="table" />}
          {admins.data && admins.data.length === 0 && (
            <EmptyState bordered icon="users" title={strings.NoAdminTitle} description={strings.NoAdmin} />
          )}
          {admins.data && admins.data.length > 0 && (
            <div className="ac-card ac-card-clip adv-table-wrap">
              <table className="ac-table adv-table">
                <colgroup><col /><col /><col style={{ width: '72px' }} /></colgroup>
                <thead>
                  <tr>
                    <th>{strings.ColumnName}</th>
                    <th>{strings.ColumnEmail}</th>
                    <th style={{ textAlign: 'right' }}>{strings.ColumnActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.data.map((admin) => (
                    <tr key={admin.itemId}>
                      <td>
                        <span style={s.person}>
                          <Avatar name={admin.displayName} />
                          <span className="ac-nowrap-ellipsis" style={{ fontWeight: 500 }}>{admin.displayName}</span>
                        </span>
                      </td>
                      <td className="ac-nowrap-ellipsis">{admin.email}</td>
                      <td>
                        <div className="ac-table-actions">
                          <button
                            type="button"
                            className="ac-icon-btn"
                            title={strings.RemoveAdmin}
                            aria-label={format(strings.RemoveAdminAriaLabel, admin.displayName)}
                            disabled={isBusy}
                            onClick={() => setToRemove(admin)}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="ac-card">
        <div className="ac-card-header">
          <h3 className="ac-card-title">{strings.SecuritySectionTitle}</h3>
          <p className="ac-card-desc">{strings.SecuritySectionDescription}</p>
        </div>
        <div className="ac-card-content">
          {security.error && <StatusMessage tone="error" message={security.error} onRetry={security.reload} />}
          {security.data && (
            <ul className="ac-card ac-card-clip" style={s.securityList}>
              {security.data.map((status, index) => (
                <li
                  key={status.definition.key}
                  style={{ ...s.securityItem, ...(index > 0 ? { borderTop: `1px solid ${TOKENS.border}` } : {}) }}
                >
                  <span style={{ fontWeight: 500 }}>{localize(status.definition.title, services.language)}</span>
                  <Badge variant={status.hasUniquePermissions ? 'success' : 'warning'} dot>
                    {status.hasUniquePermissions ? strings.SecurityStatusUnique : strings.SecurityStatusInherited}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          {isSiteOwner ? (
            <div style={a.row}>
              <button
                type="button"
                className="ac-btn ac-btn-primary"
                disabled={isBusy || !admins.data}
                aria-busy={isBusy}
                onClick={() => setIsConfirmingSecurity(true)}
              >
                <Icon name="shield" size={16} />
                {isSecured ? strings.SecurityReapply : strings.SecurityApply}
              </button>
              {isBusy && <Loader label={strings.Processing} inline />}
            </div>
          ) : (
            <StatusMessage tone="info" message={strings.SecurityOwnersOnly} />
          )}
        </div>
      </section>

      <ConfirmModal
        open={!!toRemove}
        title={strings.RemoveAdmin}
        message={toRemove ? format(strings.RemoveAdminConfirm, toRemove.displayName) : ''}
        confirmLabel={strings.RemoveAdmin}
        danger
        onConfirm={handleRemove}
        onCancel={() => setToRemove(undefined)}
      />
      <ConfirmModal
        open={isConfirmingSecurity}
        title={strings.SecurityConfirmTitle}
        message={strings.SecurityConfirmText}
        confirmLabel={strings.SecurityApply}
        onConfirm={handleSecure}
        onCancel={() => setIsConfirmingSecurity(false)}
      />
    </div>
  );
};
