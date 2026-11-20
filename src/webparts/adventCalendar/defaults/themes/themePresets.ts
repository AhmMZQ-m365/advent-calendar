import * as strings from 'AdventCalendarWebPartStrings';
import { IThemeColors, IThemeTree } from '../../models/IThemeProfile';

/**
 * Modèles de profils de thème prêts à l'emploi : couleurs de la grille, sapin (feuillage, boules, étoile, ciel, décor),
 * arrondi et neige. Ce dossier (comme `theme/`) est le seul, avec les jetons, à contenir des valeurs hexadécimales.
 *
 * Contrastes vérifiés (WCAG AA) : `text` sur `background` ≥ 7:1 pour les six modèles ; les textes posés sur une couleur
 * du profil (portes, boules, scène) sont recalculés par ThemeService (noir ou blanc), jamais choisis ici.
 * Le modèle « Classique » est aussi le repli des champs absents d'un ancien profil (DEFAULT_THEME).
 */
export interface IThemePreset {
  id: string;
  name: string;
  description: string;
  colors: IThemeColors;
  tree: IThemeTree;
  borderRadius: number;
  snowEffect: boolean;
}

/** Vert sapin, rouge baie, or : ciel de jour, boules rouge / or / ivoire / bleu. */
export const CLASSIC_PRESET: IThemePreset = {
  id: 'classic',
  name: strings.PresetClassicName,
  description: strings.PresetClassicDescription,
  colors: { primary: '#1B5E3F', secondary: '#2E7D5B', accent: '#B3261E', background: '#EEF3EE', text: '#16231B', locked: '#DCE3DD' },
  tree: {
    treeColor: '#1F6B45',
    baubleColors: ['#B3261E', '#D4A62A', '#F4EFE4', '#1F4E8C'],
    starColor: '#E8B923',
    sceneBackground: '#CFE3F0',
    sceneStyle: 'day',
    garlandLights: true
  },
  borderRadius: 8,
  snowEffect: true
};

/** Blanc, bleu glacier, argent : paysage enneigé, sapin bleu-vert profond. */
export const NORDIC_PRESET: IThemePreset = {
  id: 'nordic',
  name: strings.PresetNordicName,
  description: strings.PresetNordicDescription,
  colors: { primary: '#2B5B7A', secondary: '#4A7FA3', accent: '#3A8FB7', background: '#EAF2F8', text: '#17283A', locked: '#D5DEE7' },
  tree: {
    treeColor: '#2E6A86',
    baubleColors: ['#F5F9FC', '#A9C7DE', '#C7CDD4', '#5B8FB9'],
    starColor: '#B9C6D2',
    sceneBackground: '#E1EDF6',
    sceneStyle: 'snow',
    garlandLights: true
  },
  borderRadius: 12,
  snowEffect: true
};

/** Bleu nuit, or, lune et étoiles : sapin émeraude. */
export const NIGHT_PRESET: IThemePreset = {
  id: 'night',
  name: strings.PresetNightName,
  description: strings.PresetNightDescription,
  colors: { primary: '#D9A92B', secondary: '#7B9BE0', accent: '#E26D5C', background: '#0F1A3A', text: '#F2F5FF', locked: '#2A3763' },
  tree: {
    treeColor: '#1F7A5C',
    baubleColors: ['#E8B923', '#E8EEF7', '#E26D5C', '#6FA8DC'],
    starColor: '#FFD66B',
    sceneBackground: '#16255A',
    sceneStyle: 'night',
    garlandLights: true
  },
  borderRadius: 10,
  snowEffect: true
};

/** Rose poudré, menthe, beurre, lavande : paysage givré très doux. */
export const PASTEL_PRESET: IThemePreset = {
  id: 'pastel',
  name: strings.PresetPastelName,
  description: strings.PresetPastelDescription,
  colors: { primary: '#3E7F6D', secondary: '#C9708B', accent: '#B8587A', background: '#FBF3F6', text: '#3A2A33', locked: '#EADDE3' },
  tree: {
    treeColor: '#86BBA8',
    baubleColors: ['#F4A6B7', '#F7D58B', '#C3B1F0', '#FFFFFF'],
    starColor: '#F5C453',
    sceneBackground: '#F8E3EA',
    sceneStyle: 'snow',
    garlandLights: true
  },
  borderRadius: 16,
  snowEffect: true
};

/** Neutre et sobre, sans neige : à recolorer aux couleurs de l'entreprise (principal, boules, feuillage). */
export const CORPORATE_PRESET: IThemePreset = {
  id: 'corporate',
  name: strings.PresetCorporateName,
  description: strings.PresetCorporateDescription,
  colors: { primary: '#0F6CBD', secondary: '#1F3A5F', accent: '#D9480F', background: '#F2F4F7', text: '#1B2733', locked: '#DCE1E8' },
  tree: {
    treeColor: '#2F4858',
    baubleColors: ['#0F6CBD', '#FFFFFF', '#8895A7', '#1F3A5F'],
    starColor: '#E9B949',
    sceneBackground: '#E6EBF1',
    sceneStyle: 'day',
    garlandLights: false
  },
  borderRadius: 6,
  snowEffect: false
};

/** Bordeaux, bois, crème : soirée au chalet, sapin vert forêt. */
export const CHALET_PRESET: IThemePreset = {
  id: 'chalet',
  name: strings.PresetChaletName,
  description: strings.PresetChaletDescription,
  colors: { primary: '#7A1F36', secondary: '#6B4423', accent: '#C98B4B', background: '#F6EDE0', text: '#2B1B14', locked: '#E3D5C3' },
  tree: {
    treeColor: '#2D5A3D',
    baubleColors: ['#F3E6CF', '#C98B4B', '#A12A47', '#E7C27D'],
    starColor: '#F2C879',
    sceneBackground: '#3A1A26',
    sceneStyle: 'night',
    garlandLights: true
  },
  borderRadius: 8,
  snowEffect: true
};

/** Tous les modèles, dans l'ordre d'affichage du sélecteur. */
export const THEME_PRESETS: IThemePreset[] = [
  CLASSIC_PRESET,
  NORDIC_PRESET,
  NIGHT_PRESET,
  PASTEL_PRESET,
  CORPORATE_PRESET,
  CHALET_PRESET
];
