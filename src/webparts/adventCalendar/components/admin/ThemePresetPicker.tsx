import * as React from 'react';
import { profileFromPreset } from '../../models/IThemeProfile';
import { IThemePreset, THEME_PRESETS } from '../../defaults/themes/themePresets';
import { TOKENS } from '../../theme/tokens';
import { TreeThumbnail } from '../calendar/TreeThumbnail';

export interface IThemePresetPickerProps {
  onSelect: (preset: IThemePreset) => void;
}

const s: Record<string, React.CSSProperties> = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' },
  thumb: { overflow: 'hidden', borderRadius: '8px', border: `1px solid ${TOKENS.border}` },
  name: { fontSize: '14px', fontWeight: 600 }
};

/** Cartes des modèles de profils : mini-aperçu du sapin coloré, nom et description. Un clic choisit le modèle. */
export const ThemePresetPicker: React.FC<IThemePresetPickerProps> = ({ onSelect }) => {
  const profiles = React.useMemo(() => THEME_PRESETS.map((preset) => ({ preset, profile: profileFromPreset(preset) })), []);

  return (
    <div style={s.grid}>
      {profiles.map(({ preset, profile }) => (
        <button
          key={preset.id}
          type="button"
          className="ac-card ac-card-interactive"
          aria-label={`${preset.name}. ${preset.description}`}
          onClick={() => onSelect(preset)}
        >
          <div style={s.thumb}>
            <TreeThumbnail profile={profile} />
          </div>
          <span style={s.name}>{preset.name}</span>
          <span className="ac-muted">{preset.description}</span>
        </button>
      ))}
    </div>
  );
};
