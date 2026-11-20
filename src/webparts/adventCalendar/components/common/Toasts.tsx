import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { Icon } from '../../theme/Icons';

export interface IToast {
  id: number;
  intent: 'success' | 'error';
  title: string;
  body?: string;
}

export type NotifyFn = (toast: Omit<IToast, 'id'>) => void;

const TOAST_DURATION_MS = 4500;

/** Petit système de toasts maison (sans librairie UI). */
export function useToasts(): { toasts: IToast[]; notify: NotifyFn; dismiss: (id: number) => void } {
  const [toasts, setToasts] = React.useState<IToast[]>([]);
  const nextId = React.useRef<number>(1);
  const timers = React.useRef<number[]>([]);

  React.useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const dismiss = React.useCallback((id: number): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = React.useCallback<NotifyFn>((toast) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...toast, id }]);
    // Les erreurs restent affichées jusqu'à leur fermeture (messages SharePoint parfois longs : WCAG 2.2.1).
    if (toast.intent !== 'error') {
      timers.current.push(window.setTimeout(() => dismiss(id), TOAST_DURATION_MS));
    }
  }, [dismiss]);

  return { toasts, notify, dismiss };
}

export interface IToastsProps {
  toasts: IToast[];
  onDismiss: (id: number) => void;
}

/** Pile de notifications en bas à droite (façon Sonner) : icône par type, titre, description, bouton de fermeture. */
export const Toasts: React.FC<IToastsProps> = ({ toasts, onDismiss }) => (
  <div className="ac-toasts" aria-live="polite" aria-relevant="additions">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`ac-toast ac-toast-${toast.intent}`}
        role={toast.intent === 'error' ? 'alert' : undefined}
      >
        <Icon name={toast.intent === 'success' ? 'check-circle' : 'circle-alert'} size={18} className="ac-toast-icon" />
        <div className="ac-toast-body">
          <div className="ac-toast-title">{toast.title}</div>
          {toast.body && <div className="ac-toast-desc">{toast.body}</div>}
        </div>
        <button type="button" className="ac-icon-btn ac-icon-btn-sm" onClick={() => onDismiss(toast.id)} aria-label={strings.Close}>
          <Icon name="close" size={16} />
        </button>
      </div>
    ))}
  </div>
);
