import * as React from 'react';

export interface ISwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Texte d'aide sous le libellé. */
  description?: string;
  disabled?: boolean;
}

/**
 * Commutateur (booléen) : case à cocher native `role="switch"` masquée visuellement, piste et pouce en CSS (`.ac-switch*`).
 * Cliquable sur tout le libellé, focus clavier visible sur la piste.
 */
export const Switch: React.FC<ISwitchProps> = ({ checked, onChange, label, description, disabled }) => (
  <label className="ac-switch">
    <input
      type="checkbox"
      role="switch"
      className="ac-sr-only ac-switch-input"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span className="ac-switch-track" aria-hidden="true" />
    <span className="ac-switch-text">
      {label}
      {description && <span className="ac-switch-desc">{description}</span>}
    </span>
  </label>
);
