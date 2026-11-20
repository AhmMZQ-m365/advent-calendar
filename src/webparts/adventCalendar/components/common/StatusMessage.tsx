import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { Icon, IconName } from '../../theme/Icons';

export type StatusTone = 'error' | 'warning' | 'info' | 'success';

export interface IStatusMessageProps {
  tone: StatusTone;
  message: string;
  details?: string[];
  onRetry?: () => void;
  onDismiss?: () => void;
}

const ICONS: Record<StatusTone, IconName> = {
  error: 'circle-alert',
  warning: 'alert',
  info: 'info',
  success: 'check-circle'
};

/** `error` s'affiche en variante « destructive » de l'alerte. */
const VARIANTS: Record<StatusTone, string> = {
  error: 'destructive',
  warning: 'warning',
  info: 'info',
  success: 'success'
};

/** Alerte en ligne (façon Alert shadcn) : information, avertissement, succès ou erreur, avec icône, détails et actions. */
export const StatusMessage: React.FC<IStatusMessageProps> = ({ tone, message, details, onRetry, onDismiss }) => (
  <div className={`ac-alert ac-alert-${VARIANTS[tone]}`} role={tone === 'error' ? 'alert' : 'status'}>
    <Icon name={ICONS[tone]} size={18} className="ac-alert-icon" />
    <div className="ac-alert-body">
      {message}
      {details && details.length > 0 && (
        <ul className="ac-alert-details">
          {details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
      )}
    </div>
    {(onRetry || onDismiss) && (
      <div className="ac-alert-actions">
        {onRetry && (
          <button type="button" className="ac-btn ac-btn-outline ac-btn-sm" onClick={onRetry}>
            <Icon name="reset" size={14} />
            {strings.Retry}
          </button>
        )}
        {onDismiss && (
          <button type="button" className="ac-icon-btn ac-icon-btn-sm" onClick={onDismiss} aria-label={strings.Close}>
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
    )}
  </div>
);
