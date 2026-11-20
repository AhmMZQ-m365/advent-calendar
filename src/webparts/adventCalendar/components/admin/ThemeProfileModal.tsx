import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { IAdventServices } from '../../services/AdventServices';
import {
  applyPreset,
  DEFAULT_THEME,
  IThemeColors,
  IThemeProfile,
  IThemeTree,
  MAX_BAUBLE_COLORS,
  MIN_BAUBLE_COLORS,
  SCENE_STYLES,
  SceneStyle,
  THEME_COLOR_KEYS,
  ThemeColorKey
} from '../../models/IThemeProfile';
import { IThemePreset } from '../../defaults/themes/themePresets';
import { isFontFileUrl, isValidBaublePalette, isValidHexColor } from '../../services/ThemeService';
import { format, isHttpUrl } from '../../services/format';
import { TOKENS } from '../../theme/tokens';
import { Icon } from '../../theme/Icons';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { ColorField } from './ColorField';
import { ImageField } from './ImageField';
import { ThemePreview } from './ThemePreview';
import { ThemePresetPicker } from './ThemePresetPicker';
import { FormField } from './FormField';
import { useFieldId } from '../../hooks/useFieldId';
import { a } from '../common/layoutStyles';

export interface IThemeProfileModalProps {
  services: IAdventServices;
  profile: IThemeProfile;
  isBusy: boolean;
  onSave: (profile: IThemeProfile) => void;
  onActivate: (profile: IThemeProfile) => void;
  onDelete: (profile: IThemeProfile) => void;
  onClose: () => void;
}

const COLOR_LABELS: Record<ThemeColorKey, string> = {
  primary: strings.ColorPrimary,
  secondary: strings.ColorSecondary,
  accent: strings.ColorAccent,
  background: strings.ColorBackground,
  text: strings.ColorText,
  locked: strings.ColorLocked
};

const SCENE_STYLE_LABELS: Record<SceneStyle, string> = {
  day: strings.SceneStyleDay,
  snow: strings.SceneStyleSnow,
  night: strings.SceneStyleNight
};

const s: Record<string, React.CSSProperties> = {
  layout: { display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'flex-start' },
  fields: { flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' },
  preview: { flex: '0 1 340px', minWidth: '260px', position: 'sticky', top: 0 },
  colors: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '16px' },
  previewTitle: { margin: '0 0 12px' },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' },
  palette: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '16px' },
  paletteAction: { flexShrink: 0 },
  paletteFooter: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }
};

/** Création / modification d'un profil de thème : couleurs, sapin (feuillage, boules, étoile, décor) et aperçu en direct. */
export const ThemeProfileModal: React.FC<IThemeProfileModalProps> = (props) => {
  const { services, profile, isBusy, onSave, onActivate, onDelete, onClose } = props;
  const [draft, setDraft] = React.useState<IThemeProfile>(profile);
  const [showErrors, setShowErrors] = React.useState<boolean>(false);
  const [showPresets, setShowPresets] = React.useState<boolean>(false);
  const ids = {
    title: useFieldId('adv-profile'),
    header: useFieldId('adv-header'),
    font: useFieldId('adv-font'),
    fontUrl: useFieldId('adv-font-url'),
    radius: useFieldId('adv-radius'),
    palette: useFieldId('adv-palette'),
    scene: useFieldId('adv-scene')
  };

  React.useEffect(() => setDraft(profile), [profile]);

  const update = <K extends keyof IThemeProfile>(key: K, value: IThemeProfile[K]): void => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const updateColor = (key: keyof IThemeColors, value: string): void => {
    setDraft((current) => ({ ...current, colors: { ...current.colors, [key]: value } }));
  };
  const updateTree = <K extends keyof IThemeTree>(key: K, value: IThemeTree[K]): void => {
    setDraft((current) => ({ ...current, tree: { ...current.tree, [key]: value } }));
  };
  const updateBauble = (index: number, value: string): void => {
    updateTree('baubleColors', draft.tree.baubleColors.map((color, position) => (position === index ? value : color)));
  };
  const removeBauble = (index: number): void => {
    updateTree('baubleColors', draft.tree.baubleColors.filter((_, position) => position !== index));
  };
  const addBauble = (): void => {
    const palette = DEFAULT_THEME.tree.baubleColors;
    updateTree('baubleColors', draft.tree.baubleColors.concat(palette[draft.tree.baubleColors.length % palette.length]));
  };
  const handlePreset = (preset: IThemePreset): void => {
    setDraft((current) => applyPreset(current, preset));
    setShowPresets(false);
  };

  const titleError = showErrors && !draft.title.trim() ? strings.ErrorRequired : undefined;
  const fontUrlError = draft.fontUrl && !isFontFileUrl(draft.fontUrl) ? strings.ErrorFontFileUrl : undefined;
  // Activer applique la version enregistrée : les modifications en cours doivent l'être d'abord.
  const isDirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const logoError = draft.logoUrl && !isHttpUrl(draft.logoUrl) ? strings.ErrorInvalidUrl : undefined;
  const paletteError = !isValidBaublePalette(draft.tree.baubleColors) ? strings.ErrorBaublePalette : undefined;
  const isValid = !!draft.title.trim() && !fontUrlError && !logoError && !paletteError
    && THEME_COLOR_KEYS.every((key) => isValidHexColor(draft.colors[key]))
    && isValidHexColor(draft.tree.treeColor) && isValidHexColor(draft.tree.starColor) && isValidHexColor(draft.tree.sceneBackground);

  const handleSave = (): void => {
    setShowErrors(true);
    if (isValid) {
      onSave(draft);
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={draft.id === undefined ? strings.NewProfile : draft.title || strings.TabSettings}
        subtitle={draft.isActive ? strings.ProfileIsActive : undefined}
        width="1080px"
        closeDisabled={isBusy}
        footer={
          <div style={a.footerSpread}>
            <div>
              {draft.id !== undefined && (
                <button type="button" className="ac-btn ac-btn-destructive-outline" disabled={isBusy} onClick={() => onDelete(draft)}>
                  <Icon name="trash" size={16} />
                  {strings.Delete}
                </button>
              )}
            </div>
            <div style={a.footer}>
              <button type="button" className="ac-btn ac-btn-outline" disabled={isBusy} onClick={onClose}>
                {strings.Cancel}
              </button>
              {draft.id !== undefined && !draft.isActive && (
                <button
                  type="button"
                  className="ac-btn ac-btn-secondary"
                  disabled={isBusy || isDirty}
                  title={isDirty ? strings.SetActiveUnsavedHint : undefined}
                  onClick={() => onActivate(draft)}
                >
                  <Icon name="star" size={16} />
                  {strings.SetActive}
                </button>
              )}
              <button type="button" className="ac-btn ac-btn-primary" disabled={isBusy} aria-busy={isBusy} onClick={handleSave}>
                <Icon name="save" size={16} />
                {isBusy ? strings.Saving : strings.Save}
              </button>
            </div>
          </div>
        }
      >
        <div style={s.layout}>
          <div style={s.fields}>
            <section className="ac-section">
              <h3 className="ac-section-title">{strings.SectionGeneral}</h3>
              <div className="ac-form-row">
                <FormField label={strings.FieldProfileName} htmlFor={ids.title} required error={titleError}>
                  <input id={ids.title} className="ac-input" value={draft.title} onChange={(event) => update('title', event.target.value)} />
                </FormField>
                <FormField label={strings.FieldHeaderTitle} htmlFor={ids.header}>
                  <input id={ids.header} className="ac-input" value={draft.headerTitle} onChange={(event) => update('headerTitle', event.target.value)} />
                </FormField>
              </div>
            </section>

            <hr className="ac-separator" />

            <section className="ac-section">
              <h3 className="ac-section-title">{strings.SectionColors}</h3>
              <div style={s.colors}>
                {THEME_COLOR_KEYS.map((key) => (
                  <ColorField key={key} label={COLOR_LABELS[key]} value={draft.colors[key]} onChange={(value) => updateColor(key, value)} />
                ))}
              </div>
            </section>

            <hr className="ac-separator" />

            <section className="ac-section">
              <div style={s.sectionHead}>
                <h3 className="ac-section-title">{strings.SectionTree}</h3>
                <button type="button" className="ac-btn ac-btn-outline ac-btn-sm" disabled={isBusy} onClick={() => setShowPresets(true)}>
                  <Icon name="sparkles" size={14} />
                  {strings.ApplyPreset}
                </button>
              </div>

              <div style={s.colors}>
                <ColorField label={strings.FieldTreeColor} value={draft.tree.treeColor} onChange={(value) => updateTree('treeColor', value)} />
                <ColorField label={strings.FieldStarColor} value={draft.tree.starColor} onChange={(value) => updateTree('starColor', value)} />
                <ColorField label={strings.FieldSceneBackground} value={draft.tree.sceneBackground} onChange={(value) => updateTree('sceneBackground', value)} />
              </div>

              <div className="ac-field" role="group" aria-labelledby={ids.palette}>
                <span id={ids.palette} className="ac-field-label">{strings.FieldBaubleColors}</span>
                <div style={s.palette}>
                  {draft.tree.baubleColors.map((color, index) => (
                    <ColorField
                      key={index}
                      label={format(strings.BaubleColorN, index + 1)}
                      value={color}
                      onChange={(value) => updateBauble(index, value)}
                      action={draft.tree.baubleColors.length > MIN_BAUBLE_COLORS ? (
                        <button
                          type="button"
                          className="ac-icon-btn"
                          style={s.paletteAction}
                          aria-label={format(strings.RemoveBaubleColor, index + 1)}
                          onClick={() => removeBauble(index)}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      ) : undefined}
                    />
                  ))}
                </div>
                <div style={s.paletteFooter}>
                  <button
                    type="button"
                    className="ac-btn ac-btn-outline ac-btn-sm"
                    disabled={draft.tree.baubleColors.length >= MAX_BAUBLE_COLORS}
                    onClick={addBauble}
                  >
                    <Icon name="add" size={14} />
                    {strings.AddBaubleColor}
                  </button>
                  <span className="ac-field-desc">{strings.FieldBaubleColorsHelp}</span>
                </div>
                {paletteError && (
                  <p className="ac-field-error" role="alert">
                    <Icon name="circle-alert" size={14} />
                    {paletteError}
                  </p>
                )}
              </div>

              <div className="ac-field">
                <span id={ids.scene} className="ac-field-label">{strings.FieldSceneStyle}</span>
                <div style={{ alignSelf: 'flex-start' }}>
                  <SegmentedControl<SceneStyle>
                    ariaLabelledBy={ids.scene}
                    value={draft.tree.sceneStyle}
                    onChange={(style) => updateTree('sceneStyle', style)}
                    options={SCENE_STYLES.map((style) => ({ value: style, label: SCENE_STYLE_LABELS[style] }))}
                  />
                </div>
              </div>

              <Switch
                checked={draft.tree.garlandLights}
                onChange={(checked) => updateTree('garlandLights', checked)}
                label={strings.FieldGarlandLights}
              />
            </section>

            <hr className="ac-separator" />

            <section className="ac-section">
              <h3 className="ac-section-title">{strings.SectionTypography}</h3>
              <div className="ac-form-row">
                <FormField label={strings.FieldFontFamily} htmlFor={ids.font}>
                  <input
                    id={ids.font}
                    className="ac-input"
                    placeholder={TOKENS.font}
                    value={draft.fontFamily}
                    onChange={(event) => update('fontFamily', event.target.value)}
                  />
                </FormField>
                <FormField label={strings.FieldBorderRadius} htmlFor={ids.radius}>
                  <input
                    id={ids.radius}
                    className="ac-input"
                    type="number"
                    min={0}
                    max={32}
                    value={draft.borderRadius}
                    onChange={(event) => update('borderRadius', Math.max(0, Math.min(32, Number(event.target.value) || 0)))}
                  />
                </FormField>
              </div>

              <FormField label={strings.FieldFontUrl} htmlFor={ids.fontUrl} error={fontUrlError} help={strings.FieldFontUrlDescription}>
                <input
                  id={ids.fontUrl}
                  className="ac-input"
                  type="url"
                  placeholder="https://"
                  value={draft.fontUrl ?? ''}
                  onChange={(event) => update('fontUrl', event.target.value.trim() || undefined)}
                />
              </FormField>
            </section>

            <hr className="ac-separator" />

            <section className="ac-section">
              <h3 className="ac-section-title">{strings.SectionBranding}</h3>
              <ImageField
                services={services}
                label={strings.FieldLogo}
                value={draft.logoUrl}
                error={logoError}
                onChange={(value) => update('logoUrl', value)}
              />
              <Switch
                checked={draft.snowEffect}
                onChange={(checked) => update('snowEffect', checked)}
                label={strings.FieldSnowEffect}
              />
            </section>
          </div>

          <div style={s.preview}>
            <h3 className="ac-section-title" style={s.previewTitle}>{strings.PreviewTitle}</h3>
            <ThemePreview profile={draft} />
          </div>
        </div>
      </Modal>

      <Modal open={showPresets} onClose={() => setShowPresets(false)} title={strings.PresetPickerTitle} subtitle={strings.PresetApplyWarning} width="980px">
        {showPresets && <ThemePresetPicker onSelect={handlePreset} />}
      </Modal>
    </>
  );
};
