import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { isValidHexColor } from '../../services/ThemeService';
import { format } from '../../services/format';
import { TOKENS } from '../../theme/tokens';
import { FormField } from './FormField';
import { useFieldId } from '../../hooks/useFieldId';

export interface IColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Contrôle optionnel placé après la saisie (ex. bouton « Retirer » d'une couleur de la palette). */
  action?: React.ReactNode;
}

const groupStyle: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'center' };

/**
 * Champ couleur : pastille (sélecteur natif) et saisie hexadécimale (#RRGGBB) dans un même cadre, sans librairie.
 * La pastille affiche la couleur saisie ; le sélecteur natif, invisible, la recouvre et reste atteignable au clavier.
 */
export const ColorField: React.FC<IColorFieldProps> = ({ label, value, onChange, action }) => {
  const [text, setText] = React.useState<string>(value);
  const inputId = useFieldId('adv-color');
  const messageId = useFieldId('adv-color-msg');
  const isValid = isValidHexColor(text);
  const isValueValid = isValidHexColor(value);

  React.useEffect(() => setText(value), [value]);

  const handleText = (next: string): void => {
    const trimmed = next.trim();
    const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    setText(next);
    if (isValidHexColor(normalized)) {
      onChange(normalized.toUpperCase());
    }
  };

  return (
    <FormField label={label} htmlFor={inputId} error={isValid ? undefined : strings.ErrorHexColor} messageId={messageId}>
      <div style={groupStyle}>
        <div className={`ac-color${isValid ? '' : ' ac-color--invalid'}`} style={{ flex: 1 }}>
          <span className="ac-color-swatch" style={{ backgroundColor: isValueValid ? value : undefined }}>
            <input
              type="color"
              value={isValueValid ? value : TOKENS.black}
              aria-label={format(strings.OpenColorPicker, label)}
              onChange={(event) => onChange(event.target.value.toUpperCase())}
            />
          </span>
          <input
            id={inputId}
            className="ac-color-text"
            value={text}
            maxLength={7}
            spellCheck={false}
            aria-invalid={isValid ? undefined : true}
            aria-describedby={isValid ? undefined : messageId}
            onChange={(event) => handleText(event.target.value)}
          />
        </div>
        {action}
      </div>
    </FormField>
  );
};
