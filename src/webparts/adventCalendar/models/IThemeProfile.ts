import { Nullable } from './spTypes';
import { IUrlFieldValue } from './IPublication';
import { TOKENS } from '../theme/tokens';
import { CLASSIC_PRESET, IThemePreset } from '../defaults/themes/themePresets';

export interface IThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  locked: string;
}

export type ThemeColorKey = keyof IThemeColors;

export const THEME_COLOR_KEYS: ThemeColorKey[] = ['primary', 'secondary', 'accent', 'background', 'text', 'locked'];

/** Décor de la scène du sapin : ciel de jour, paysage enneigé ou nuit étoilée. */
export type SceneStyle = 'day' | 'snow' | 'night';

export const SCENE_STYLES: SceneStyle[] = ['day', 'snow', 'night'];

/** Nombre de couleurs de boules : la palette est utilisée en rotation sur les 24 boules. */
export const MIN_BAUBLE_COLORS = 3;
export const MAX_BAUBLE_COLORS = 6;

/** Réglages du sapin (présentation principale du calendrier). */
export interface IThemeTree {
  /** Feuillage du sapin. */
  treeColor: string;
  /** Palette des boules (3 à 6 couleurs #RRGGBB). */
  baubleColors: string[];
  /** Étoile du sommet, guirlande et crochets des boules. */
  starColor: string;
  /** Couleur du ciel (haut de la scène) ; le décor en dérive les dégradés et la neige. */
  sceneBackground: string;
  sceneStyle: SceneStyle;
  /** Guirlande lumineuse (lumières qui scintillent). */
  garlandLights: boolean;
}

export interface IThemeProfile {
  /** `undefined` pour un profil pas encore enregistré. */
  id: number | undefined;
  title: string;
  isActive: boolean;
  colors: IThemeColors;
  tree: IThemeTree;
  fontFamily: string;
  fontUrl: string | undefined;
  logoUrl: string | undefined;
  headerTitle: string;
  borderRadius: number;
  snowEffect: boolean;
}

/** Ligne brute renvoyée par l'API REST pour la liste AdventSettings. */
export interface IThemeProfileItem {
  Id: number;
  Title: Nullable<string>;
  AdvIsActive: Nullable<boolean>;
  AdvPrimaryColor: Nullable<string>;
  AdvSecondaryColor: Nullable<string>;
  AdvAccentColor: Nullable<string>;
  AdvBackgroundColor: Nullable<string>;
  AdvTextColor: Nullable<string>;
  AdvLockedColor: Nullable<string>;
  AdvFontFamily: Nullable<string>;
  AdvFontUrl: Nullable<IUrlFieldValue>;
  AdvLogo: Nullable<IUrlFieldValue>;
  AdvHeaderTitle: Nullable<string>;
  AdvBorderRadius: Nullable<number>;
  AdvSnowEffect: Nullable<boolean>;
  // Réglages du sapin (absents des listes provisionnées avant la 2.0 : `undefined` à la lecture).
  AdvTreeColor?: Nullable<string>;
  AdvBaubleColors?: Nullable<string>;
  AdvStarColor?: Nullable<string>;
  AdvSceneBackground?: Nullable<string>;
  AdvSceneStyle?: Nullable<string>;
  AdvGarlandLights?: Nullable<boolean>;
}

/** Copie profonde des réglages d'un modèle (les tableaux ne sont jamais partagés). */
export function cloneTree(tree: IThemeTree): IThemeTree {
  return { ...tree, baubleColors: tree.baubleColors.slice() };
}

/**
 * Thème par défaut = modèle « Classique » (defaults/themes/themePresets.ts) : utilisé quand aucun profil
 * n'est actif ou forcé, comme repli des champs absents d'un ancien profil et comme valeurs initiales.
 */
export const DEFAULT_THEME: IThemeProfile = {
  id: undefined,
  title: '',
  isActive: false,
  colors: { ...CLASSIC_PRESET.colors },
  tree: cloneTree(CLASSIC_PRESET.tree),
  fontFamily: TOKENS.font,
  fontUrl: undefined,
  logoUrl: undefined,
  headerTitle: '',
  borderRadius: CLASSIC_PRESET.borderRadius,
  snowEffect: CLASSIC_PRESET.snowEffect
};

/**
 * Applique un modèle à un profil : couleurs, sapin, arrondi et neige sont remplacés ;
 * identité (nom, titre affiché, logo, police) et état (actif) sont conservés.
 */
export function applyPreset(profile: IThemeProfile, preset: IThemePreset): IThemeProfile {
  return {
    ...profile,
    colors: { ...preset.colors },
    tree: cloneTree(preset.tree),
    borderRadius: preset.borderRadius,
    snowEffect: preset.snowEffect
  };
}

/** Nouveau profil (non enregistré) initialisé depuis un modèle. */
export function profileFromPreset(preset: IThemePreset): IThemeProfile {
  return applyPreset({ ...DEFAULT_THEME, title: preset.name }, preset);
}
