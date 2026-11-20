import * as React from 'react';
import { nextRovingIndex } from './focus';

export interface ISegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Compteur affiché après le libellé (ex. nombre de jours par statut). */
  count?: number;
}

export interface ISegmentedControlProps<T extends string> {
  options: Array<ISegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Nom accessible du groupe (ou `ariaLabelledBy` si un libellé visible existe). */
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

/**
 * Contrôle segmenté à sélection unique (radiogroup) : piste grise, segment actif blanc (`.ac-segmented*`).
 * Clavier : flèches, Début, Fin ; la sélection suit le focus ; seul le segment actif est dans l'ordre de tabulation.
 */
export function SegmentedControl<T extends string>(props: ISegmentedControlProps<T>): React.ReactElement {
  const { options, value, onChange, ariaLabel, ariaLabelledBy } = props;
  const buttons = React.useRef<Array<HTMLButtonElement | undefined>>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const next = nextRovingIndex(event.key, index, options.length, 'both');
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    onChange(options[next].value);
    const target = buttons.current[next];
    if (target) {
      target.focus();
    }
  };

  return (
    <div className="ac-segmented" role="radiogroup" aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className="ac-segmented-btn"
            ref={(element) => { buttons.current[index] = element ?? undefined; }}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.label}
            {option.count !== undefined && <span className="ac-segmented-count">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
