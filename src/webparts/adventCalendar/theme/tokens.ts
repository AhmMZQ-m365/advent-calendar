/**
 * Jetons de design de l'application (couleurs, rayons, ombres, typographie, mouvement) et utilitaires de couleur.
 *
 * Langage visuel inspiré de shadcn/ui (thème « new-york », neutres zinc), reproduit en CSS natif, sans dépendance :
 * surfaces blanches sur fond gris très clair, bordures fines, ombres très douces, un seul accent (vert sapin)
 * réservé aux actions principales, à l'anneau de focus et à l'état actif.
 *
 * Contrastes WCAG vérifiés (texte) : `foreground` sur blanc 19,6:1, `mutedForeground` 7,7:1, `subtleForeground` 4,8:1 (blanc
 * uniquement : placeholders, icônes) ; blanc sur `primary` 7,7:1, sur `destructive` 6,6:1 ; `success`, `warning` et `danger`
 * sur leur fond teinté ≥ 4,9:1. Bordure des champs (`controlBorder`) ≥ 3:1 sur blanc (WCAG 1.4.11).
 *
 * Seul ce dossier `theme/` contient des valeurs hexadécimales : les composants passent par `TOKENS`
 * (styles en ligne), par les variables `--ac-*` (CSS et SCSS) ou par `tint()` / `textOn()`.
 */

// Aucune police embarquée ni distante : pile système, la même famille que Microsoft 365.

const PRIMARY = "#1B5E3F";
const SUCCESS = "#0E6B57";
const DANGER = "#B42318";
const WARNING = "#B54708";
const WHITE = "#FFFFFF";
const BLACK = "#000000";

function rgb(hex: string): number[] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

/** Luminance relative WCAG d'une couleur #RRGGBB. */
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG entre deux couleurs. */
function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Couleur de texte (noir ou blanc) la plus contrastée sur un fond donné (WCAG). */
export function textOn(bg: string): string {
  const lum = luminance(bg);
  return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.05 ? WHITE : BLACK;
}

/** Texte `preferred` s'il reste lisible (≥ 4,5:1) sur `bg`, sinon noir ou blanc. */
export function readableOn(bg: string, preferred: string): string {
  return contrastRatio(preferred, bg) >= 4.5 ? preferred : textOn(bg);
}

/** Mélange plein de deux couleurs : `ratio` = part de `other` (0 = `base`, 1 = `other`). Jamais de transparence. */
export function mix(base: string, other: string, ratio: number): string {
  const a = rgb(base);
  const b = rgb(other);
  return `#${a
    .map((c, i) => Math.round(c + (b[i] - c) * ratio).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

/**
 * Teinte pleine d'une couleur (mélange avec le blanc) : on éclaircit en réduisant la teinte,
 * jamais avec une opacité (rendu stable quel que soit le fond). `ratio` = part de la couleur (0.1 = 10 %).
 */
export function tint(hex: string, ratio: number): string {
  return mix(WHITE, hex, ratio);
}

/** Version assombrie d'une couleur (mélange avec le noir) : `ratio` = part de la couleur (0.7 = 30 % de noir). */
export function shade(hex: string, ratio: number): string {
  return mix(BLACK, hex, ratio);
}

export const TOKENS = {
  // === Accent (vert sapin) : actions principales, focus, état actif ===
  primary: PRIMARY,
  primaryHover: "#256E4C",
  primaryPressed: "#14472F",
  primaryForeground: WHITE,
  primaryLight: tint(PRIMARY, 0.07), // survol, fond d'élément actif
  primaryRing: tint(PRIMARY, 0.18), // halo de focus des champs, bordure d'élément actif
  wood: "#6B4423", // tronc du sapin (décor)

  // === États ===
  success: SUCCESS,
  successLight: tint(SUCCESS, 0.1),
  successBorder: tint(SUCCESS, 0.3),
  danger: DANGER, // = destructive
  dangerHover: "#991B14",
  dangerLight: tint(DANGER, 0.06),
  dangerBorder: tint(DANGER, 0.3),
  dangerRing: tint(DANGER, 0.45),
  warning: WARNING,
  warningLight: tint(WARNING, 0.08),
  warningBorder: tint(WARNING, 0.35),

  // === Neutres (zinc) ===
  white: WHITE,
  black: BLACK,
  gray100: "#F4F4F5",
  gray200: "#E4E4E7",
  gray300: "#D4D4D8",
  gray400: "#A1A1AA",

  // === Rôles (équivalents shadcn : foreground, muted-foreground, border, input, card, muted, background) ===
  text: "#09090B", // foreground
  textMuted: "#52525B", // muted-foreground
  textSubtle: "#71717A", // placeholders, icônes (sur blanc uniquement)
  border: "#E4E4E7",
  borderStrong: "#D4D4D8",
  controlBorder: "#8F8F99", // bordure des champs et des commutateurs : ≥ 3:1 sur blanc
  surface: WHITE, // card, popover
  muted: "#F4F4F5", // fond des zones secondaires, squelettes, survol
  background: "#FAFAFA",

  // Pile système (aucun fichier de police). Corps de texte, puis variante « Display » pour titres et chiffres.
  font: '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif',
  fontDisplay: '"Segoe UI Variable Display", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif'
};

const T = TOKENS;

/**
 * Variables CSS `--ac-*`, posées sur `.ac-root` (racine du web part) et consommées par GLOBAL_CSS et les modules SCSS.
 * Les variables `--ac-text`, `--ac-white`, `--ac-radius-card`… sont lues par le SCSS du sapin.
 * Les ombres sont les seules couleurs semi-transparentes (noir neutre, très faible opacité).
 */
export const TOKENS_CSS = `
.ac-root {
  /* Surfaces et texte */
  --ac-background: ${T.background};
  --ac-foreground: ${T.text};
  --ac-card: ${T.surface};
  --ac-popover: ${T.surface};
  --ac-muted: ${T.muted};
  --ac-muted-foreground: ${T.textMuted};
  --ac-subtle-foreground: ${T.textSubtle};
  --ac-disabled-foreground: ${T.gray400};
  --ac-hover: ${T.gray100};
  --ac-border: ${T.border};
  --ac-border-strong: ${T.borderStrong};
  --ac-input: ${T.controlBorder};
  --ac-input-hover: ${T.textSubtle};
  --ac-switch-off: ${T.gray400};
  --ac-overlay: rgba(9, 9, 11, 0.55);

  /* Accent et états */
  --ac-primary: ${T.primary};
  --ac-primary-hover: ${T.primaryHover};
  --ac-primary-pressed: ${T.primaryPressed};
  --ac-primary-foreground: ${T.primaryForeground};
  --ac-primary-light: ${T.primaryLight};
  --ac-primary-ring: ${T.primaryRing};
  --ac-ring: ${T.primary};
  --ac-secondary: ${T.gray100};
  --ac-secondary-hover: ${T.gray200};
  --ac-destructive: ${T.danger};
  --ac-destructive-hover: ${T.dangerHover};
  --ac-destructive-bg: ${T.dangerLight};
  --ac-destructive-border: ${T.dangerBorder};
  --ac-destructive-ring: ${T.dangerRing};
  --ac-success: ${T.success};
  --ac-success-bg: ${T.successLight};
  --ac-success-border: ${T.successBorder};
  --ac-warning: ${T.warning};
  --ac-warning-bg: ${T.warningLight};
  --ac-warning-border: ${T.warningBorder};

  /* Variables lues par le SCSS du calendrier et du sapin */
  --ac-white: ${T.white};
  --ac-text: ${T.text};
  --ac-text-muted: ${T.textMuted};

  /* Typographie : échelle 12 / 13 / 14 / 16 / 18 / 20 / 24 / 30, graisses 400 / 500 / 600 */
  --ac-font: ${T.font};
  --ac-font-display: ${T.fontDisplay};
  --ac-fs-xs: 12px;
  --ac-fs-sm: 13px;
  --ac-fs-base: 14px;
  --ac-fs-md: 16px;
  --ac-fs-lg: 18px;
  --ac-fs-xl: 20px;
  --ac-fs-2xl: 24px;
  --ac-lh-tight: 1.25;
  --ac-lh-snug: 1.4;
  --ac-lh-normal: 1.5;
  --ac-lh-relaxed: 1.7;
  --ac-fw-normal: 400;
  --ac-fw-medium: 500;
  --ac-fw-semibold: 600;

  /* Rayons */
  --ac-radius-sm: 6px;
  --ac-radius-md: 8px;
  --ac-radius-lg: 10px;
  --ac-radius-xl: 14px;
  --ac-radius-card: 12px;

  /* Ombres très douces */
  --ac-shadow-xs: 0 1px 2px rgba(9, 9, 11, 0.05);
  --ac-shadow-sm: 0 1px 3px rgba(9, 9, 11, 0.08), 0 1px 2px rgba(9, 9, 11, 0.04);
  --ac-shadow-md: 0 4px 10px -2px rgba(9, 9, 11, 0.09), 0 2px 4px -2px rgba(9, 9, 11, 0.05);
  --ac-shadow-lg: 0 20px 44px -10px rgba(9, 9, 11, 0.22), 0 6px 14px -6px rgba(9, 9, 11, 0.1);

  /* Mouvement */
  --ac-dur-fast: 150ms;
  --ac-dur: 200ms;
  --ac-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
`;
