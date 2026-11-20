/**
 * Géométrie de la scène « Sapin » : dessin SVG vectoriel et positions des 24 boules, en TROIS formats choisis selon la
 * largeur du calendrier (TreeScene mesure son conteneur, pas la fenêtre) :
 *   - `wide`   (>= 1024 px) : paysage 16:9 (repère 1600 x 900), bloc d'information à gauche, boules en rangées 3 / 5 / 7 / 9 ;
 *   - `medium` (560 à 1023 px) : 5:4 (repère 1200 x 960), bloc d'information au-dessus, rangées 3 / 5 / 7 / 9, boules plus grosses ;
 *   - `narrow` (< 560 px) : portrait (repère 560 x 960), bloc d'information au-dessus, 5 étages, rangées 2 / 3 / 4 / 5 / 5 / 5.
 * Chaque format a son propre dessin (étages, guirlandes, cadeaux, collines, ciel) : un viewBox par format est plus fiable
 * que de déformer un seul dessin. Les 24 positions suivent l'ordre de lecture de DOOR_LAYOUT (haut en bas, gauche à droite).
 * Aucune couleur ici : le rendu (TreeArt.tsx, TreeScene.module.scss) les lit dans les variables `--adv-*` du profil.
 *
 * Le sapin est composé d'étages à bord inférieur festonné, du plus petit (haut) au plus grand (bas) ; chaque étage dépasse
 * sur le suivant, ce qui laisse une bande visible où sont posées une guirlande puis une rangée de boules.
 */

/** Zone du dessin affichée : toute la scène, ou le sapin seul (aperçus miniatures de l'administration). */
export interface ISceneView {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type TreeFormat = 'wide' | 'medium' | 'narrow';

/** Largeurs de conteneur (px) à partir desquelles s'applique le format. En dessous de `medium` : `narrow`. */
export const TREE_BREAKPOINTS = { wide: 1024, medium: 560 };

/** Format du sapin pour une largeur de conteneur mesurée (0 = pas encore mesurée : paysage). */
export function getTreeFormat(width: number): TreeFormat {
  if (width <= 0 || width >= TREE_BREAKPOINTS.wide) {
    return 'wide';
  }
  return width >= TREE_BREAKPOINTS.medium ? 'medium' : 'narrow';
}

export interface ITier {
  /** Sommet (pointe) de l'étage. */
  top: number;
  /** Ordonnée du bord inférieur (avant festons). */
  base: number;
  /** Demi-largeur au bord inférieur. */
  halfWidth: number;
}

/** Profondeur des festons du bord inférieur de chaque étage. */
export const SCALLOP_DEPTH = 16;

/** Demi-largeur de l'étage à l'ordonnée `y`. */
export function tierWidthAt(tier: ITier, y: number): number {
  return (tier.halfWidth * (y - tier.top)) / (tier.base - tier.top);
}

function format(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** Contour d'un étage : pointe, flanc droit, bord inférieur festonné (de droite à gauche), flanc gauche. */
export function tierPath(tier: ITier, center: number, yOffset = 0): string {
  const { top, base, halfWidth } = tier;
  const count = Math.max(3, Math.round(halfWidth / 52));
  const step = (halfWidth * 2) / count;
  const y = base + yOffset;
  let path = `M ${center} ${format(top + yOffset)} L ${center + halfWidth} ${format(y)}`;
  for (let i = 0; i < count; i++) {
    const xEnd = center + halfWidth - step * (i + 1);
    const xMid = xEnd + step / 2;
    path += ` Q ${format(xMid)} ${format(y + SCALLOP_DEPTH * 2)} ${format(xEnd)} ${format(y)}`;
  }
  return `${path} Z`;
}

/** Calotte de neige posée sur le haut d'un étage (décor « neige »). */
export function tierSnowPath(tier: ITier, center: number): string {
  const { top, base, halfWidth } = tier;
  const height = (base - top) * 0.34;
  const w = (halfWidth * height) / (base - top);
  const y = top + height;
  return `M ${center} ${top - 2} L ${format(center + w + 3)} ${format(y)}`
    + ` Q ${format(center + w * 0.55)} ${format(y + 24)} ${format(center + w * 0.2)} ${format(y + 6)}`
    + ` Q ${format(center - w * 0.15)} ${format(y + 26)} ${format(center - w * 0.5)} ${format(y + 8)}`
    + ` Q ${format(center - w * 0.8)} ${format(y + 20)} ${format(center - w - 3)} ${format(y)} Z`;
}

/** Étoile à 5 branches centrée en (cx, cy). */
export function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${format(cx + radius * Math.cos(angle))},${format(cy + radius * Math.sin(angle))}`);
  }
  return `M ${points.join(' L ')} Z`;
}

// ------------------------------------------------------------------ Boules

/** Hauteur de la zone cliquable / largeur : le crochet dépasse de 15 % au-dessus du corps rond. */
export const BAUBLE_ASPECT = 1.15;

export interface IBaublePlacement {
  /** Centre du corps rond. */
  x: number;
  y: number;
}

interface IBaubleRow {
  count: number;
  step: number;
  y: number;
  /** Alternance verticale (± amp) : les boules voisines ne se touchent pas. */
  amp: number;
}

/** Les boules des rangées dans l'ordre de lecture (de haut en bas, de gauche à droite). */
function placeBaubles(center: number, rows: IBaubleRow[]): IBaublePlacement[] {
  return rows.reduce<IBaublePlacement[]>((all, row) => {
    for (let i = 0; i < row.count; i++) {
      all.push({
        x: center + (i - (row.count - 1) / 2) * row.step,
        y: row.y + (i % 2 === 0 ? row.amp : -row.amp)
      });
    }
    return all;
  }, []);
}

// ------------------------------------------------------------------ Guirlande

export interface IGarlandSwag {
  /** Courbe de la guirlande (quadratique d'un flanc à l'autre de l'étage). */
  path: string;
  /** Position des lumières suspendues à la guirlande. */
  lights: Array<{ x: number; y: number }>;
}

interface IGarlandRow {
  tier: number;
  y: number;
  sag: number;
  lights: number;
}

function buildGarlands(center: number, tiers: ITier[], rows: IGarlandRow[]): IGarlandSwag[] {
  return rows.map((row) => {
    const half = tierWidthAt(tiers[row.tier], row.y) + 3;
    const x0 = center - half;
    const x2 = center + half;
    const control = row.y + row.sag * 2;
    const lights: Array<{ x: number; y: number }> = [];
    for (let k = 1; k <= row.lights; k++) {
      const t = k / (row.lights + 1);
      const u = 1 - t;
      lights.push({
        x: u * u * x0 + 2 * u * t * center + t * t * x2,
        y: u * u * row.y + 2 * u * t * control + t * t * row.y + 7
      });
    }
    return { path: `M ${format(x0)} ${row.y} Q ${center} ${control} ${format(x2)} ${row.y}`, lights };
  });
}

// ------------------------------------------------------------------ Cadeaux, étoiles du ciel, sapins lointains

export interface IGift {
  x: number;
  /** Ordonnée du haut du paquet. */
  y: number;
  w: number;
  h: number;
  /** Couleur de boule (1 = première de la palette, en rotation). */
  color: number;
}

/** Pseudo-aléatoire déterministe : le décor est identique d'un rendu à l'autre. */
function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export interface ISkyStar {
  x: number;
  y: number;
  r: number;
  /** Retard d'animation (secondes, négatif) pour que le scintillement ne soit pas synchrone. */
  delay: number;
}

interface IStarField {
  count: number;
  width: number;
  /** Hauteur de la zone du ciel étoilé. */
  height: number;
  /** Zone de la lune, laissée libre. */
  hole: { x0: number; x1: number; y0: number; y1: number };
}

/** Étoiles de la nuit : évitent la zone de la lune. */
function buildSkyStars(field: IStarField): ISkyStar[] {
  const { hole } = field;
  return Array.from({ length: field.count }, (_, index) => ({
    x: Math.round(seeded(index, 1) * (field.width - 40) + 20),
    y: Math.round(seeded(index, 2) * field.height + 20),
    r: Math.round((1.4 + seeded(index, 3) * 2.2) * 10) / 10,
    delay: -Math.round(seeded(index, 4) * 60) / 10
  })).filter((star) => !(star.x > hole.x0 && star.x < hole.x1 && star.y > hole.y0 && star.y < hole.y1));
}

export interface IPine {
  x: number;
  h: number;
  w: number;
}

// ------------------------------------------------------------------ Les trois formats

export interface ITreeLayout {
  format: TreeFormat;
  /** Dimensions du repère SVG (viewBox) : le ratio de la scène en découle. */
  width: number;
  height: number;
  /** Axe vertical du sapin. */
  center: number;
  tiers: ITier[];
  trunk: { x: number; y: number; width: number; height: number };
  /** Étoile du sommet. */
  star: { x: number; y: number; outer: number; inner: number };
  /** Diamètre d'une boule (unités du repère). */
  baubleDiameter: number;
  /** 24 positions, dans l'ordre de DOOR_LAYOUT. */
  baubles: IBaublePlacement[];
  garlands: IGarlandSwag[];
  gifts: IGift[];
  /** Soleil / lune : centre et échelle (1 = taille du format paysage). */
  celestial: { x: number; y: number; scale: number };
  skyStars: ISkyStar[];
  /** Petits sapins lointains du décor « neige » et ordonnée de leur pied. */
  pines: IPine[];
  pineBase: number;
  /** Collines et neige du sol, ombre ovale au pied du sapin. */
  groundBackPath: string;
  groundPath: string;
  groundFrontPath: string;
  groundShadow: { cy: number; rx: number; ry: number };
}

// Paysage 16:9 : bloc d'information à gauche, sapin à droite.
const WIDE_TIERS: ITier[] = [
  { top: 100, base: 300, halfWidth: 140 },
  { top: 215, base: 480, halfWidth: 215 },
  { top: 370, base: 660, halfWidth: 290 },
  { top: 540, base: 830, halfWidth: 370 }
];

const WIDE: ITreeLayout = {
  format: 'wide',
  width: 1600,
  height: 900,
  center: 1000,
  tiers: WIDE_TIERS,
  trunk: { x: 958, y: 800, width: 84, height: 72 },
  star: { x: 1000, y: 86, outer: 40, inner: 17 },
  baubleDiameter: 62,
  baubles: placeBaubles(1000, [
    { count: 3, step: 76, y: 258, amp: 8 },
    { count: 5, step: 70, y: 428, amp: 9 },
    { count: 7, step: 68, y: 608, amp: 9 },
    { count: 9, step: 68, y: 782, amp: 9 }
  ]),
  garlands: buildGarlands(1000, WIDE_TIERS, [
    { tier: 0, y: 178, sag: 20, lights: 5 },
    { tier: 1, y: 350, sag: 24, lights: 7 },
    { tier: 2, y: 530, sag: 26, lights: 9 },
    { tier: 3, y: 706, sag: 26, lights: 11 }
  ]),
  gifts: [
    { x: 566, y: 830, w: 50, h: 52, color: 3 },
    { x: 606, y: 812, w: 84, h: 70, color: 1 },
    { x: 1318, y: 800, w: 48, h: 82, color: 2 },
    { x: 1366, y: 822, w: 70, h: 60, color: 4 }
  ],
  celestial: { x: 1410, y: 190, scale: 1 },
  skyStars: buildSkyStars({ count: 44, width: 1600, height: 520, hole: { x0: 1330, x1: 1500, y0: 90, y1: 270 } }),
  pines: [
    { x: 70, h: 120, w: 38 }, { x: 140, h: 86, w: 28 }, { x: 215, h: 104, w: 34 }, { x: 300, h: 78, w: 26 },
    { x: 385, h: 110, w: 36 }, { x: 470, h: 82, w: 28 }, { x: 540, h: 100, w: 32 },
    { x: 1450, h: 96, w: 32 }, { x: 1515, h: 124, w: 40 }, { x: 1575, h: 84, w: 28 }
  ],
  pineBase: 780,
  groundBackPath: 'M 0 770 C 260 705 520 790 820 750 S 1380 700 1600 750 L 1600 900 L 0 900 Z',
  groundPath: 'M 0 836 C 260 806 520 856 800 840 S 1360 818 1600 846 L 1600 900 L 0 900 Z',
  groundFrontPath: 'M 0 884 C 300 858 620 894 1000 874 S 1450 852 1600 882 L 1600 900 L 0 900 Z',
  groundShadow: { cy: 862, rx: 350, ry: 16 }
};

// Tablette / colonne moyenne : sapin pleine largeur (rangées 3 / 5 / 7 / 9, boules de 88 unités = 41 px à 560 px de large).
const MEDIUM_TIERS: ITier[] = [
  { top: 90, base: 290, halfWidth: 198 },
  { top: 215, base: 469, halfWidth: 306 },
  { top: 394, base: 648, halfWidth: 432 },
  { top: 573, base: 827, halfWidth: 556 }
];

const MEDIUM: ITreeLayout = {
  format: 'medium',
  width: 1200,
  height: 960,
  center: 600,
  tiers: MEDIUM_TIERS,
  trunk: { x: 556, y: 805, width: 88, height: 70 },
  star: { x: 600, y: 74, outer: 44, inner: 19 },
  baubleDiameter: 88,
  baubles: placeBaubles(600, [
    { count: 3, step: 98, y: 238, amp: 8 },
    { count: 5, step: 98, y: 417, amp: 8 },
    { count: 7, step: 98, y: 596, amp: 8 },
    { count: 9, step: 98, y: 775, amp: 8 }
  ]),
  garlands: buildGarlands(600, MEDIUM_TIERS, [
    { tier: 0, y: 138, sag: 16, lights: 3 },
    { tier: 1, y: 326, sag: 16, lights: 5 },
    { tier: 2, y: 505, sag: 18, lights: 7 },
    { tier: 3, y: 684, sag: 18, lights: 9 }
  ]),
  gifts: [
    { x: 34, y: 888, w: 56, h: 52, color: 3 },
    { x: 82, y: 872, w: 92, h: 68, color: 1 },
    { x: 1018, y: 858, w: 52, h: 82, color: 2 },
    { x: 1066, y: 880, w: 78, h: 60, color: 4 }
  ],
  celestial: { x: 1070, y: 170, scale: 0.78 },
  skyStars: buildSkyStars({ count: 36, width: 1200, height: 520, hole: { x0: 960, x1: 1190, y0: 60, y1: 290 } }),
  pines: [{ x: 36, h: 100, w: 30 }, { x: 90, h: 74, w: 24 }, { x: 1110, h: 80, w: 26 }, { x: 1166, h: 106, w: 32 }],
  pineBase: 800,
  groundBackPath: 'M 0 770 C 195 726 400 790 615 758 S 1035 716 1200 756 L 1200 960 L 0 960 Z',
  groundPath: 'M 0 838 C 195 812 390 852 600 840 S 1020 822 1200 846 L 1200 960 L 0 960 Z',
  groundFrontPath: 'M 0 918 C 225 896 465 924 750 908 S 1087 892 1200 916 L 1200 960 L 0 960 Z',
  groundShadow: { cy: 857, rx: 480, ry: 18 }
};

// Téléphone / colonne étroite : composition portrait, 6 rangées de boules de 78 unités (45 px à 360 px de large, 41 px à 320 px).
const NARROW_TIERS: ITier[] = [
  { top: 72, base: 224, halfWidth: 116 },
  { top: 158, base: 356, halfWidth: 158 },
  { top: 290, base: 488, halfWidth: 210 },
  { top: 422, base: 620, halfWidth: 262 },
  { top: 554, base: 752, halfWidth: 268 },
  { top: 686, base: 884, halfWidth: 274 }
];

const NARROW: ITreeLayout = {
  format: 'narrow',
  width: 560,
  height: 960,
  center: 280,
  tiers: NARROW_TIERS,
  trunk: { x: 240, y: 876, width: 80, height: 58 },
  star: { x: 280, y: 58, outer: 32, inner: 14 },
  baubleDiameter: 78,
  baubles: placeBaubles(280, [
    { count: 2, step: 84, y: 184, amp: 5 },
    { count: 3, step: 84, y: 316, amp: 5 },
    { count: 4, step: 84, y: 448, amp: 5 },
    { count: 5, step: 84, y: 580, amp: 5 },
    { count: 5, step: 84, y: 712, amp: 5 },
    { count: 5, step: 84, y: 844, amp: 5 }
  ]),
  garlands: buildGarlands(280, NARROW_TIERS, [
    { tier: 0, y: 128, sag: 7, lights: 2 },
    { tier: 1, y: 236, sag: 8, lights: 3 },
    { tier: 2, y: 368, sag: 8, lights: 4 },
    { tier: 3, y: 500, sag: 8, lights: 5 },
    { tier: 4, y: 632, sag: 8, lights: 5 },
    { tier: 5, y: 764, sag: 8, lights: 5 }
  ]),
  // Décor simplifié : deux paquets seulement.
  gifts: [
    { x: 16, y: 896, w: 52, h: 56, color: 3 },
    { x: 494, y: 902, w: 48, h: 50, color: 2 }
  ],
  celestial: { x: 490, y: 118, scale: 0.55 },
  skyStars: buildSkyStars({ count: 28, width: 560, height: 380, hole: { x0: 410, x1: 550, y0: 40, y1: 200 } }),
  pines: [{ x: 26, h: 84, w: 24 }, { x: 66, h: 60, w: 18 }, { x: 496, h: 70, w: 20 }, { x: 536, h: 92, w: 26 }],
  pineBase: 840,
  groundBackPath: 'M 0 846 C 140 810 270 866 400 838 S 520 806 560 836 L 560 960 L 0 960 Z',
  groundPath: 'M 0 892 C 140 874 270 904 400 894 S 520 878 560 896 L 560 960 L 0 960 Z',
  groundFrontPath: 'M 0 934 C 150 918 300 940 420 930 S 520 918 560 932 L 560 960 L 0 960 Z',
  groundShadow: { cy: 906, rx: 250, ry: 12 }
};

/** Les trois jeux de géométrie (dessin + positions des boules), indexés par format. */
export const TREE_LAYOUTS: Record<TreeFormat, ITreeLayout> = { wide: WIDE, medium: MEDIUM, narrow: NARROW };

/** Scène entière du format paysage, et sapin seul (aperçus miniatures de l'administration, toujours en paysage). */
export const SCENE_COMPACT: ISceneView = { x: 560, y: 50, w: 880, h: 850 };

/** Zone affichée d'un format : tout le repère. */
export function fullView(layout: ITreeLayout): ISceneView {
  return { x: 0, y: 0, w: layout.width, h: layout.height };
}
