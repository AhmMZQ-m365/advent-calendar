import * as React from 'react';
import { Icon } from '../../theme/Icons';
import { useFieldId } from '../../hooks/useFieldId';

export interface IFormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  /** Description sous le contrôle (masquée quand une erreur est affichée). */
  help?: string;
  /**
   * Identifiant du message (erreur ou description). À fournir quand le contrôle n'est pas un enfant direct
   * (ex. un `<input>` dans un conteneur) : l'appelant pose alors lui-même `aria-describedby` sur l'input.
   */
  messageId?: string;
  children: React.ReactNode;
}

/** Éléments natifs qui reçoivent `aria-invalid` / `aria-describedby` (pas les conteneurs `div`). */
const NATIVE_CONTROLS = ['input', 'select', 'textarea'];

/**
 * Champ de formulaire : libellé + contrôle + description ou erreur (`.ac-field*`).
 * Quand le contrôle est un élément natif (input, select, textarea), il reçoit `aria-invalid` et `aria-describedby`.
 */
export const FormField: React.FC<IFormFieldProps> = ({ label, htmlFor, required, error, help, messageId: providedMessageId, children }) => {
  const generatedMessageId = useFieldId('adv-field-msg');
  const messageId = providedMessageId ?? generatedMessageId;
  const hasMessage = !!error || !!help;
  const control = React.isValidElement(children) && typeof children.type === 'string' && NATIVE_CONTROLS.indexOf(children.type) !== -1
    ? React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      'aria-invalid': error ? true : undefined,
      'aria-describedby': hasMessage ? messageId : undefined
    })
    : children;

  return (
    <div className={`ac-field${error ? ' ac-field--invalid' : ''}`}>
      <label className="ac-field-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="ac-field-required" aria-hidden="true"> *</span>}
      </label>
      {control}
      {error ? (
        <p id={messageId} className="ac-field-error" role="alert">
          <Icon name="circle-alert" size={14} />
          {error}
        </p>
      ) : help && <p id={messageId} className="ac-field-desc">{help}</p>}
    </div>
  );
};
