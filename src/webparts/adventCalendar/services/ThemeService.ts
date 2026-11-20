import { Nullable } from '../models/spTypes';
import {
  DEFAULT_THEME,
  IThemeColors,
  IThemeProfile,
  IThemeProfileItem,
  IThemeTree,
  MAX_BAUBLE_COLORS,
  MIN_BAUBLE_COLORS,
  SCENE_STYLES,
  SceneStyle
} from '../models/IThemeProfile';
import { TOKENS, mix, readableOn, shade, textOn, tint } from '../theme/tokens';
import { isHttpsUrl, safeHttpUrl } from './format';

const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{6})$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

/** Palette des boules saisie ou stockée sous forme de texte : `#RRGGBB,#RRGGBB,…` (virgules ou espaces). */
export function parseBaublePalette(text: Nullable<string> | undefined): string[] | undefined {
  if (!text) {
    return undefined;
  }
  const colors = text.split(/[\s,;]+/).filter((part) => part.length > 0);
  if (!isValidBaublePalette(colors)) {
    return undefined;
  }
  return colors.map((color) => color.toUpperCase());
}

export function serializeBaublePalette(colors: string[]): string {
  return colors.join(',');
}

/** Palette valide (3 à 6 couleurs hexadécimales), prête à être enregistrée. */
export function isValidBaublePalette(colors: string[]): boolean {
  return colors.length >= MIN_BAUBLE_COLORS && colors.length <= MAX_BAUBLE_COLORS && colors.every(isValidHexColor);
}

/** Palette utilisable pour le rendu : couleurs invalides écartées, repli sur la palette par défaut si moins de 3 restent. */
export function normalizeBaublePalette(colors: string[]): string[] {
  const valid = colors.filter(isValidHexColor).slice(0, MAX_BAUBLE_COLORS).map((color) => color.toUpperCase());
  return valid.length >= MIN_BAUBLE_COLORS ? valid : DEFAULT_THEME.tree.baubleColors.slice();
}

/** Texte secondaire (TOKENS.textMuted) s'il reste lisible (≥ 4.5:1) sur le fond, sinon noir ou blanc. */
function secondaryTextOn(bg: string): string {
  return readableOn(bg, TOKENS.textMuted);
}

function isDark(bg: string): boolean {
  return textOn(bg) === TOKENS.white;
}

function colorOrDefault(value: Nullable<string> | undefined, fallback: string): string {
  return value && isValidHexColor(value) ? value : fallback;
}

function sceneStyleOrDefault(value: Nullable<string> | undefined, fallback: SceneStyle): SceneStyle {
  const style = SCENE_STYLES.filter((candidate) => candidate === value)[0];
  return style ?? fallback;
}

/**
 * Police d'un profil : vide, ou pile héritée d'une ancienne police embarquée qui n'est plus chargée
 * (profils créés avant la 2.x, sans fichier de police associé), retombe sur la pile système par défaut.
 */
function fontFamilyOrDefault(value: Nullable<string> | undefined, hasFontUrl: boolean): string {
  const font = value?.trim();
  return !font || (!hasFontUrl && /outfit/i.test(font)) ? DEFAULT_THEME.fontFamily : font;
}

/**
 * Fichier de police chargeable : URL HTTPS dont le chemin se termine par .woff2, .woff, .ttf ou .otf,
 * sans guillemet, parenthèse ni antislash. Les feuilles de style (.css) ne sont jamais chargées.
 */
export function isFontFileUrl(value: string): boolean {
  if (!isHttpsUrl(value) || /["'()\\]/.test(value)) {
    return false;
  }
  try {
    return /\.(woff2?|ttf|otf)$/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

/** Profil depuis une ligne de la liste ; chaque champ absent ou invalide retombe sur le modèle « Classique ». */
export function mapThemeItem(item: IThemeProfileItem): IThemeProfile {
  const rawFontUrl = item.AdvFontUrl?.Url;
  const fontUrl = rawFontUrl && isFontFileUrl(rawFontUrl) ? rawFontUrl : undefined;
  const defaults = DEFAULT_THEME.colors;
  const treeDefaults: IThemeTree = DEFAULT_THEME.tree;
  return {
    id: item.Id,
    title: item.Title ?? '',
    isActive: item.AdvIsActive === true,
    colors: {
      primary: colorOrDefault(item.AdvPrimaryColor, defaults.primary),
      secondary: colorOrDefault(item.AdvSecondaryColor, defaults.secondary),
      accent: colorOrDefault(item.AdvAccentColor, defaults.accent),
      background: colorOrDefault(item.AdvBackgroundColor, defaults.background),
      text: colorOrDefault(item.AdvTextColor, defaults.text),
      locked: colorOrDefault(item.AdvLockedColor, defaults.locked)
    },
    tree: {
      treeColor: colorOrDefault(item.AdvTreeColor, treeDefaults.treeColor),
      baubleColors: parseBaublePalette(item.AdvBaubleColors) ?? treeDefaults.baubleColors.slice(),
      starColor: colorOrDefault(item.AdvStarColor, treeDefaults.starColor),
      sceneBackground: colorOrDefault(item.AdvSceneBackground, treeDefaults.sceneBackground),
      sceneStyle: sceneStyleOrDefault(item.AdvSceneStyle, treeDefaults.sceneStyle),
      garlandLights: typeof item.AdvGarlandLights === 'boolean' ? item.AdvGarlandLights : treeDefaults.garlandLights
    },
    fontFamily: fontFamilyOrDefault(item.AdvFontFamily, !!fontUrl),
    fontUrl,
    logoUrl: safeHttpUrl(item.AdvLogo?.Url),
    headerTitle: item.AdvHeaderTitle ?? '',
    borderRadius: typeof item.AdvBorderRadius === 'number' ? item.AdvBorderRadius : DEFAULT_THEME.borderRadius,
    snowEffect: item.AdvSnowEffect === true
  };
}

interface ISceneColors {
  top: string;
  bottom: string;
  ground: string;
  groundBack: string;
  groundFront: string;
}

/** Dégradé du ciel et teintes du sol selon le décor : tout est mélangé en couleurs pleines (aucune transparence). */
function sceneColors(style: SceneStyle, scene: string): ISceneColors {
  let top: string;
  let bottom: string;
  let groundRatio: number;
  let backRatio: number;
  if (style === 'night') {
    top = shade(scene, 0.7);
    bottom = mix(scene, TOKENS.white, 0.14);
    groundRatio = 0.62;
    backRatio = 0.4;
  } else if (style === 'snow') {
    top = scene;
    bottom = tint(scene, 0.5);
    groundRatio = 0.88;
    backRatio = 0.7;
  } else {
    top = scene;
    bottom = tint(scene, 0.35);
    groundRatio = 0.82;
    backRatio = 0.62;
  }
  const ground = mix(scene, TOKENS.white, groundRatio);
  return {
    top,
    bottom,
    ground,
    groundBack: mix(scene, TOKENS.white, backRatio),
    groundFront: mix(ground, TOKENS.white, 0.55)
  };
}

/** Variables du sapin : scène, feuillage, étoile et palette des boules (`--adv-bauble-1..n`, avec reflet, ombre et texte). */
function getTreeCssVariables(theme: IThemeProfile): Record<string, string> {
  const tree = theme.tree;
  const scene = sceneColors(tree.sceneStyle, tree.sceneBackground);
  const sky = mix(scene.top, scene.bottom, 0.5);
  const sceneText = readableOn(sky, theme.colors.text);
  const palette = normalizeBaublePalette(tree.baubleColors);

  const variables: Record<string, string> = {
    '--adv-scene-top': scene.top,
    '--adv-scene-bottom': scene.bottom,
    '--adv-ground': scene.ground,
    '--adv-ground-back': scene.groundBack,
    '--adv-ground-front': scene.groundFront,
    '--adv-scene-text': sceneText,
    '--adv-scene-track': mix(sky, sceneText, 0.2),
    '--adv-scene-snow': isDark(sky) ? TOKENS.white : shade(sky, 0.78),
    '--adv-pine': mix(scene.bottom, tree.treeColor, 0.4),
    '--adv-tree': tree.treeColor,
    '--adv-tree-light': tint(tree.treeColor, 0.82),
    '--adv-tree-dark': shade(tree.treeColor, 0.7),
    '--adv-tree-deep': shade(tree.treeColor, 0.5),
    '--adv-trunk': TOKENS.wood,
    '--adv-trunk-dark': shade(TOKENS.wood, 0.7),
    '--adv-star': tree.starColor,
    '--adv-star-dark': shade(tree.starColor, 0.7),
    '--adv-star-light': tint(tree.starColor, 0.45),
    '--adv-bauble-count': String(palette.length)
  };
  palette.forEach((color, index) => {
    const n = index + 1;
    variables[`--adv-bauble-${n}`] = color;
    variables[`--adv-bauble-${n}-hi`] = tint(color, 0.55);
    variables[`--adv-bauble-${n}-lo`] = shade(color, 0.68);
    variables[`--adv-on-bauble-${n}`] = textOn(color);
  });
  return variables;
}

/**
 * Variables CSS appliquées sur le conteneur racine (et sur les panneaux, rendus hors de l'arbre DOM).
 * Les couleurs de texte posées sur une couleur du profil sont calculées (textOn) pour garantir le contraste,
 * et les versions claires sont des teintes pleines (tint), jamais des transparences.
 */
export function getThemeCssVariables(theme: IThemeProfile): Record<string, string> {
  const colors: IThemeColors = theme.colors;
  const primaryTint = tint(colors.primary, 0.05);
  const onPrimary = textOn(colors.primary);
  const onSecondary = textOn(colors.secondary);
  return {
    '--adv-primary': colors.primary,
    '--adv-on-primary': onPrimary,
    '--adv-primary-deep': shade(colors.primary, 0.8),
    '--adv-primary-line': mix(colors.primary, onPrimary, 0.45),
    '--adv-primary-tint': primaryTint,
    '--adv-on-tint': readableOn(primaryTint, colors.text),
    '--adv-secondary': colors.secondary,
    '--adv-on-secondary': onSecondary,
    '--adv-secondary-deep': shade(colors.secondary, 0.8),
    '--adv-secondary-line': mix(colors.secondary, onSecondary, 0.45),
    '--adv-accent': colors.accent,
    '--adv-on-accent': textOn(colors.accent),
    '--adv-background': colors.background,
    '--adv-text': colors.text,
    '--adv-text-secondary': secondaryTextOn(colors.background),
    '--adv-locked': colors.locked,
    '--adv-locked-hi': tint(colors.locked, 0.4),
    '--adv-locked-lo': shade(colors.locked, 0.82),
    '--adv-on-locked': secondaryTextOn(colors.locked),
    '--adv-snow': isDark(colors.background) ? TOKENS.white : TOKENS.gray300,
    '--adv-font-family': theme.fontFamily,
    // Titres et chiffres : variante « Display » de la pile système tant que le profil garde la police par défaut.
    '--adv-font-display': theme.fontFamily === DEFAULT_THEME.fontFamily ? TOKENS.fontDisplay : theme.fontFamily,
    '--adv-radius': `${Math.max(0, Math.min(32, theme.borderRadius))}px`,
    ...getTreeCssVariables(theme)
  };
}

/** Premier nom de famille d'une pile CSS (`'Ma police', sans-serif` -> `Ma police`). */
function primaryFontFamily(fontFamily: string): string {
  return fontFamily.split(',')[0].replace(/["']/g, '').trim();
}

/**
 * Charge le fichier de police du profil (API FontFace : aucune feuille de style n'est injectée dans la page)
 * et renvoie la fonction qui retire la police ajoutée.
 */
export function ensureFontFace(url: string | undefined, fontFamily: string): () => void {
  const family = primaryFontFamily(fontFamily);
  if (!url || !family || !isFontFileUrl(url) || typeof FontFace === 'undefined' || !document.fonts) {
    return () => undefined;
  }
  const face = new FontFace(family, `url("${url}")`);
  let isDisposed = false;
  face.load()
    .then(() => {
      if (!isDisposed) {
        document.fonts.add(face);
      }
    })
    .catch(() => undefined);
  return () => {
    isDisposed = true;
    document.fonts.delete(face);
  };
}
