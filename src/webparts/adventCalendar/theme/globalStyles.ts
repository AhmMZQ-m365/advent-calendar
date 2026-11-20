import { TOKENS as T, TOKENS_CSS } from "./tokens";

/**
 * CSS global du web part, injecté UNE fois via un <style> dans le composant racine (AdventCalendar.tsx).
 * Toutes les classes sont préfixées `ac-` pour éviter toute collision avec la page SharePoint.
 * On ne gère ici que ce que les styles en ligne React ne savent pas faire :
 * :hover, :focus, ::before / ::after, transitions, animations, états ARIA.
 *
 * `.ac-root` porte les variables `--ac-*` (tokens.ts) ; `.ac-theme` applique la police et la couleur de texte.
 * Langage visuel inspiré de shadcn/ui, en CSS natif : voir CLAUDE.md § 6 pour la liste des classes.
 *
 * Règle : aucun `transform`, `filter` ni `container-type` sur un ancêtre d'un overlay (Modal, toasts) au repos,
 * sinon `position: fixed` devient relatif à cet ancêtre. Les entrées animées utilisent des @keyframes sans remplissage.
 */

/** Encode une couleur #RRGGBB pour une URL de données SVG. */
const svgColor = (hex: string): string => hex.replace("#", "%23");

/** Chevron (bas) en URL de données : flèche des listes natives et des accordéons. */
const chevronDown = (hex: string): string =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${svgColor(hex)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

const BASE_CSS = `
.ac-root, .ac-root *, .ac-root *::before, .ac-root *::after { box-sizing: border-box; }
.ac-root { -webkit-font-smoothing: antialiased; overflow-wrap: break-word; }
.ac-theme { font-family: var(--ac-font); font-size: var(--ac-fs-base); color: var(--ac-foreground); line-height: var(--ac-lh-normal); }
.ac-sr-only {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

/* ===== Typographie ===== */
.ac-page-head { display: flex; flex-direction: column; gap: 4px; }
.ac-page-title { margin: 0; font-family: var(--ac-font-display); font-size: var(--ac-fs-2xl); font-weight: var(--ac-fw-semibold); letter-spacing: -0.02em; line-height: var(--ac-lh-tight); }
.ac-page-desc { margin: 0; max-width: 68ch; font-size: var(--ac-fs-base); color: var(--ac-muted-foreground); }
.ac-section-title { margin: 0; font-size: var(--ac-fs-md); font-weight: var(--ac-fw-semibold); line-height: var(--ac-lh-snug); letter-spacing: -0.01em; }
.ac-muted { margin: 0; font-size: var(--ac-fs-sm); color: var(--ac-muted-foreground); }
.ac-nowrap-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-tabular { font-variant-numeric: tabular-nums; }

/* ===== Boutons : primary (défaut), secondary, outline, ghost, destructive ; tailles sm / défaut ===== */
.ac-btn {
  position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 36px; padding: 0 16px; border: 1px solid transparent; border-radius: var(--ac-radius-md);
  font-family: inherit; font-size: var(--ac-fs-base); font-weight: var(--ac-fw-medium); line-height: 1; white-space: nowrap;
  text-decoration: none; cursor: pointer; user-select: none;
  background: transparent; color: var(--ac-foreground);
  transition: background-color var(--ac-dur-fast) var(--ac-ease), border-color var(--ac-dur-fast) var(--ac-ease),
    color var(--ac-dur-fast) var(--ac-ease), box-shadow var(--ac-dur-fast) var(--ac-ease);
}
.ac-btn:disabled, .ac-btn[aria-disabled="true"] { cursor: not-allowed; box-shadow: none; color: var(--ac-disabled-foreground); }
.ac-btn-primary { background: var(--ac-primary); color: var(--ac-primary-foreground); box-shadow: var(--ac-shadow-xs); }
.ac-btn-primary:not(:disabled):hover { background: var(--ac-primary-hover); }
.ac-btn-primary:not(:disabled):active { background: var(--ac-primary-pressed); }
.ac-btn-primary:disabled { background: var(--ac-muted); }
.ac-btn-secondary { background: var(--ac-secondary); color: var(--ac-foreground); }
.ac-btn-secondary:not(:disabled):hover { background: var(--ac-secondary-hover); }
.ac-btn-secondary:disabled { background: var(--ac-muted); }
.ac-btn-outline { background: var(--ac-card); border-color: var(--ac-border-strong); box-shadow: var(--ac-shadow-xs); }
.ac-btn-outline:not(:disabled):hover { background: var(--ac-hover); border-color: var(--ac-input-hover); }
.ac-btn-outline:not(:disabled):active { background: var(--ac-secondary-hover); }
.ac-btn-outline:disabled { background: var(--ac-card); border-color: var(--ac-border); }
.ac-btn-ghost { background: transparent; }
.ac-btn-ghost:not(:disabled):hover { background: var(--ac-hover); }
.ac-btn-ghost:not(:disabled):active { background: var(--ac-secondary-hover); }
.ac-btn-destructive { background: var(--ac-destructive); color: var(--ac-primary-foreground); box-shadow: var(--ac-shadow-xs); }
.ac-btn-destructive:not(:disabled):hover { background: var(--ac-destructive-hover); }
.ac-btn-destructive:disabled { background: var(--ac-muted); }
.ac-btn-destructive-outline { background: var(--ac-card); color: var(--ac-destructive); border-color: var(--ac-destructive-border); box-shadow: var(--ac-shadow-xs); }
.ac-btn-destructive-outline:not(:disabled):hover { background: var(--ac-destructive-bg); border-color: var(--ac-destructive); }
.ac-btn-destructive-outline:disabled { background: var(--ac-card); border-color: var(--ac-border); }
.ac-btn-sm { height: 32px; padding: 0 12px; gap: 6px; font-size: var(--ac-fs-sm); }
/* Bouton icône seul (ghost carré 32 px) ; aria-pressed = bascule active (barre d'outils de l'éditeur) */
.ac-icon-btn {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 32px; height: 32px; padding: 0; border: 0; border-radius: var(--ac-radius-md);
  background: transparent; color: var(--ac-muted-foreground); cursor: pointer;
  transition: background-color var(--ac-dur-fast) var(--ac-ease), color var(--ac-dur-fast) var(--ac-ease);
}
.ac-icon-btn:not(:disabled):hover { background: var(--ac-hover); color: var(--ac-foreground); }
.ac-icon-btn:not(:disabled):active { background: var(--ac-secondary-hover); }
.ac-icon-btn[aria-pressed="true"] { background: var(--ac-secondary-hover); color: var(--ac-foreground); }
.ac-icon-btn:disabled { cursor: not-allowed; color: var(--ac-disabled-foreground); }
.ac-icon-btn-sm { width: 28px; height: 28px; border-radius: var(--ac-radius-sm); }
.ac-btn:focus-visible, .ac-icon-btn:focus-visible { outline: 2px solid var(--ac-ring); outline-offset: 2px; }
/* Chargement : le spinner remplace l'icône, la largeur ne change pas (le libellé reste) */
.ac-btn[aria-busy="true"] { pointer-events: none; }
.ac-btn[aria-busy="true"] > svg { display: none; }
.ac-btn[aria-busy="true"]::before {
  content: ""; flex-shrink: 0; width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid currentColor; border-right-color: transparent; animation: ac-spin .7s linear infinite;
}

/* ===== Champs : input, select natif, textarea ===== */
.ac-input, .ac-select {
  display: block; width: 100%; min-width: 0; max-width: 100%; height: 36px; padding: 0 12px;
  border: 1px solid var(--ac-input); border-radius: var(--ac-radius-md);
  background-color: var(--ac-card); color: var(--ac-foreground);
  font-family: inherit; font-size: var(--ac-fs-base); line-height: 20px; box-shadow: var(--ac-shadow-xs); outline: none;
  transition: border-color var(--ac-dur-fast) var(--ac-ease), box-shadow var(--ac-dur-fast) var(--ac-ease);
}
.ac-input::placeholder { color: var(--ac-subtle-foreground); }
.ac-input[type="search"]::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; }
.ac-select {
  -webkit-appearance: none; appearance: none; cursor: pointer; padding-right: 36px; text-overflow: ellipsis;
  background-image: ${chevronDown(T.textSubtle)}; background-repeat: no-repeat; background-position: right 12px center;
}
.ac-input:not(:disabled):not(:focus):hover, .ac-select:not(:disabled):not(:focus):hover {
  border-color: var(--ac-input-hover);
}
.ac-input:focus, .ac-select:focus {
  border-color: var(--ac-ring); box-shadow: var(--ac-shadow-xs), 0 0 0 3px var(--ac-primary-ring);
}
.ac-input[aria-invalid="true"], .ac-select[aria-invalid="true"], .ac-field--invalid .ac-input {
  border-color: var(--ac-destructive);
}
.ac-input[aria-invalid="true"]:focus, .ac-select[aria-invalid="true"]:focus, .ac-field--invalid .ac-input:focus {
  border-color: var(--ac-destructive); box-shadow: var(--ac-shadow-xs), 0 0 0 3px var(--ac-destructive-ring);
}
.ac-input:disabled, .ac-select:disabled {
  background-color: var(--ac-muted); color: var(--ac-subtle-foreground); cursor: not-allowed; box-shadow: none;
}
.ac-select option { color: var(--ac-foreground); }
/* Champ avec icône (recherche) ou bouton intégré (date) */
.ac-input-wrap { position: relative; min-width: 0; }
.ac-input-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  display: flex; color: var(--ac-subtle-foreground); pointer-events: none;
}
.ac-input-wrap--icon .ac-input { padding-left: 36px; }
.ac-input-addon { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); }

/* Libellé, description, erreur */
.ac-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ac-field-label { display: block; margin: 0; font-size: var(--ac-fs-base); font-weight: var(--ac-fw-medium); line-height: var(--ac-lh-tight); color: var(--ac-foreground); }
.ac-field-required { color: var(--ac-destructive); }
.ac-field-desc { margin: 0; font-size: var(--ac-fs-sm); line-height: var(--ac-lh-snug); color: var(--ac-muted-foreground); }
.ac-field-error { margin: 0; display: flex; align-items: flex-start; gap: 6px; font-size: var(--ac-fs-sm); font-weight: var(--ac-fw-medium); line-height: var(--ac-lh-snug); color: var(--ac-destructive); }
.ac-field-error > svg { margin-top: 1px; }
/* Ligne de formulaire 2 colonnes → 1 colonne sur écran étroit */
.ac-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.ac-form-row > * { min-width: 0; }
@media (max-width: 640px) { .ac-form-row { grid-template-columns: 1fr; } }

/* ===== Switch (booléens) ===== */
.ac-switch { display: inline-flex; align-items: flex-start; gap: 12px; position: relative; cursor: pointer; max-width: 100%; }
.ac-switch-track {
  position: relative; flex-shrink: 0; width: 36px; height: 20px; margin-top: 1px; border-radius: 999px;
  background: var(--ac-switch-off); transition: background-color var(--ac-dur-fast) var(--ac-ease);
}
.ac-switch-track::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
  background: var(--ac-card); box-shadow: var(--ac-shadow-sm); transition: transform var(--ac-dur-fast) var(--ac-ease);
}
.ac-switch-input:checked + .ac-switch-track { background: var(--ac-primary); }
.ac-switch-input:checked + .ac-switch-track::after { transform: translateX(16px); }
.ac-switch-input:focus-visible + .ac-switch-track { outline: 2px solid var(--ac-ring); outline-offset: 2px; }
.ac-switch-input:disabled + .ac-switch-track { background: var(--ac-border); }
.ac-switch-input:disabled ~ .ac-switch-text { color: var(--ac-subtle-foreground); }
.ac-switch-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; font-size: var(--ac-fs-base); font-weight: var(--ac-fw-medium); line-height: 22px; }
.ac-switch-desc { font-size: var(--ac-fs-sm); font-weight: var(--ac-fw-normal); line-height: var(--ac-lh-snug); color: var(--ac-muted-foreground); }

/* ===== Contrôle segmenté (façon liste d'onglets shadcn : piste grise, segment actif blanc) ===== */
.ac-segmented {
  display: inline-flex; gap: 2px; padding: 3px; max-width: 100%;
  background: var(--ac-muted); border-radius: var(--ac-radius-lg); overflow-x: auto;
}
.ac-segmented-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 30px; padding: 0 12px;
  border: 0; border-radius: var(--ac-radius-md); background: transparent; cursor: pointer; white-space: nowrap;
  font-family: inherit; font-size: var(--ac-fs-sm); font-weight: var(--ac-fw-medium); color: var(--ac-muted-foreground);
  transition: background-color var(--ac-dur-fast) var(--ac-ease), color var(--ac-dur-fast) var(--ac-ease), box-shadow var(--ac-dur-fast) var(--ac-ease);
}
.ac-segmented-btn:hover { color: var(--ac-foreground); }
.ac-segmented-btn[aria-checked="true"] { background: var(--ac-card); color: var(--ac-foreground); box-shadow: var(--ac-shadow-sm); }
.ac-segmented-btn:focus-visible { outline: 2px solid var(--ac-ring); outline-offset: 1px; }
.ac-segmented-count { font-size: var(--ac-fs-xs); font-weight: var(--ac-fw-medium); color: var(--ac-subtle-foreground); font-variant-numeric: tabular-nums; }

/* ===== Onglets de la barre du haut : texte, soulignement fin sur l'onglet actif ===== */
.ac-tabs { display: flex; align-items: stretch; gap: 4px; }
.ac-tab {
  position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 0 12px;
  border: 0; background: transparent; cursor: pointer; font-family: inherit;
  font-size: var(--ac-fs-base); font-weight: var(--ac-fw-medium); color: var(--ac-muted-foreground);
  transition: color var(--ac-dur-fast) var(--ac-ease);
}
.ac-tab::after {
  content: ""; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 2px;
  border-radius: 2px 2px 0 0; background: transparent; transition: background-color var(--ac-dur-fast) var(--ac-ease);
}
.ac-tab:hover { color: var(--ac-foreground); }
.ac-tab[aria-selected="true"] { color: var(--ac-foreground); }
.ac-tab[aria-selected="true"]::after { background: var(--ac-primary); }
.ac-tab:focus-visible { outline: 2px solid var(--ac-ring); outline-offset: -4px; border-radius: var(--ac-radius-md); }

/* ===== Overlay (Modal) =====
   Même z-index que les panneaux : l'ordre DOM détermine l'empilement,
   donc l'overlay d'une 2e modale recouvre bien la 1re (dialogues empilés). */
@keyframes ac-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes ac-dialog-in { from { opacity: 0; transform: translateY(6px) scale(.96); } to { opacity: 1; transform: none; } }
.ac-overlay { position: fixed; inset: 0; z-index: 1001; background: var(--ac-overlay); -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
.ac-overlay--open { animation: ac-fade-in var(--ac-dur) ease-out; }

/* En-tête, corps, pied : utilisés par Modal */
.ac-dialog-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-shrink: 0;
  padding: 20px 24px 16px; border-bottom: 1px solid var(--ac-border);
}
.ac-dialog-heading { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.ac-dialog-title {
  margin: 0; font-family: var(--ac-font-display); font-size: var(--ac-fs-lg); font-weight: var(--ac-fw-semibold);
  line-height: var(--ac-lh-snug); letter-spacing: -0.01em; overflow-wrap: anywhere;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.ac-dialog-desc { margin: 0; font-size: var(--ac-fs-base); line-height: var(--ac-lh-snug); color: var(--ac-muted-foreground); }
.ac-dialog-body { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 24px; }
.ac-dialog-footer {
  flex-shrink: 0; padding: 16px 24px; border-top: 1px solid var(--ac-border);
  background: var(--ac-background); border-radius: 0 0 var(--ac-radius-xl) var(--ac-radius-xl);
}

/* ===== Boîte de dialogue centrée (Modal, façon Dialog shadcn) ===== */
.ac-modal-wrap {
  position: fixed; inset: 0; z-index: 1001;
  display: flex; align-items: center; justify-content: center;
  padding: 32px 20px; pointer-events: none;
}
.ac-modal {
  pointer-events: auto; position: relative; width: 100%; max-height: min(88vh, 940px);
  display: flex; flex-direction: column; background: var(--ac-popover);
  border: 1px solid var(--ac-border); border-radius: var(--ac-radius-xl); box-shadow: var(--ac-shadow-lg); outline: none;
}
.ac-modal--open { animation: ac-dialog-in var(--ac-dur) var(--ac-ease); }
@media (max-width: 640px) {
  .ac-modal-wrap { padding: 12px; }
  .ac-modal { max-height: 95vh; }
  .ac-dialog-header, .ac-dialog-body, .ac-dialog-footer { padding-left: 16px; padding-right: 16px; }
}

/* ===== Cartes ===== */
.ac-card { background: var(--ac-card); color: var(--ac-foreground); border: 1px solid var(--ac-border); border-radius: var(--ac-radius-card); box-shadow: var(--ac-shadow-xs); }
.ac-card-clip { overflow: hidden; }
.ac-card-header { display: flex; flex-direction: column; gap: 4px; padding: 20px 24px 0; }
.ac-card-title { margin: 0; font-size: var(--ac-fs-md); font-weight: var(--ac-fw-semibold); line-height: var(--ac-lh-snug); letter-spacing: -0.01em; }
.ac-card-desc { margin: 0; max-width: 72ch; font-size: var(--ac-fs-base); line-height: var(--ac-lh-snug); color: var(--ac-muted-foreground); }
.ac-card-content { display: flex; flex-direction: column; gap: 16px; padding: 20px 24px; }
.ac-card-header + .ac-card-content { padding-top: 16px; }
/* Carte entièrement cliquable (profils, modèles) : bordure et ombre changent, rien ne bouge */
.ac-card-interactive {
  display: flex; flex-direction: column; gap: 10px; width: 100%; padding: 12px; text-align: left; cursor: pointer;
  font-family: inherit; color: var(--ac-foreground);
  transition: border-color var(--ac-dur-fast) var(--ac-ease), box-shadow var(--ac-dur-fast) var(--ac-ease);
}
.ac-card-interactive:hover { border-color: var(--ac-input-hover); box-shadow: var(--ac-shadow-md); }
.ac-card-interactive:focus-visible { outline: 2px solid var(--ac-ring); outline-offset: 2px; }
.ac-section { display: flex; flex-direction: column; gap: 16px; }
.ac-separator { width: 100%; height: 1px; margin: 0; border: 0; background: var(--ac-border); flex-shrink: 0; }
.ac-separator-v { width: 1px; height: auto; align-self: stretch; }

/* ===== Badges ===== */
.ac-badge {
  display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 10px; border: 1px solid transparent;
  border-radius: 999px; font-size: var(--ac-fs-xs); font-weight: var(--ac-fw-medium); line-height: 1; white-space: nowrap;
}
.ac-badge-outline { background: var(--ac-card); border-color: var(--ac-border-strong); color: var(--ac-foreground); }
.ac-badge-success { background: var(--ac-success-bg); border-color: var(--ac-success-border); color: var(--ac-success); }
.ac-badge-warning { background: var(--ac-warning-bg); border-color: var(--ac-warning-border); color: var(--ac-warning); }
.ac-badge-dot::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.ac-badge-lg { height: 30px; padding: 0 12px 0 4px; gap: 8px; font-size: var(--ac-fs-sm); }
.ac-badge-lg .ac-badge-dot-icon {
  display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
}

/* ===== Alertes (StatusMessage) : information, avertissement, succès, erreur ===== */
.ac-alert {
  display: flex; align-items: flex-start; flex-wrap: wrap; gap: 12px; padding: 12px 16px;
  border: 1px solid var(--ac-border); border-radius: var(--ac-radius-lg); background: var(--ac-card);
  font-size: var(--ac-fs-base); line-height: var(--ac-lh-normal); color: var(--ac-foreground);
}
.ac-alert-icon { flex-shrink: 0; margin-top: 2px; color: var(--ac-alert-accent, var(--ac-foreground)); }
.ac-alert-body { flex: 1 1 220px; min-width: 0; }
.ac-alert-details { margin: 6px 0 0; padding-left: 18px; font-size: var(--ac-fs-sm); color: var(--ac-muted-foreground); }
.ac-alert-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; margin-left: auto; }
.ac-alert-info { --ac-alert-accent: var(--ac-primary); background: var(--ac-primary-light); border-color: var(--ac-primary-ring); }
.ac-alert-success { --ac-alert-accent: var(--ac-success); background: var(--ac-success-bg); border-color: var(--ac-success-border); }
.ac-alert-warning { --ac-alert-accent: var(--ac-warning); background: var(--ac-warning-bg); border-color: var(--ac-warning-border); }
.ac-alert-destructive { --ac-alert-accent: var(--ac-destructive); background: var(--ac-destructive-bg); border-color: var(--ac-destructive-border); }
.ac-alert-destructive .ac-alert-body { color: var(--ac-destructive); font-weight: var(--ac-fw-medium); }
.ac-alert-destructive .ac-alert-details { font-weight: var(--ac-fw-normal); }

/* ===== Tableau (façon data-table shadcn) ===== */
.ac-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; font-size: var(--ac-fs-base); }
.ac-table th {
  height: 40px; padding: 0 16px; text-align: left; white-space: nowrap; user-select: none;
  font-size: var(--ac-fs-sm); font-weight: var(--ac-fw-medium); color: var(--ac-muted-foreground);
  background: var(--ac-background); border-bottom: 1px solid var(--ac-border);
}
.ac-table td { height: 52px; padding: 0 16px; vertical-align: middle; color: var(--ac-foreground); border-bottom: 1px solid var(--ac-border); }
.ac-table tbody tr:last-child td { border-bottom: 0; }
.ac-table-num { font-weight: var(--ac-fw-medium); font-variant-numeric: tabular-nums; }
.ac-table-actions { display: flex; justify-content: flex-end; gap: 2px; }
.ac-row { cursor: pointer; transition: background-color var(--ac-dur-fast) var(--ac-ease); }
.ac-row:hover { background: var(--ac-background); }
.ac-row:focus-visible { outline: 2px solid var(--ac-ring); outline-offset: -2px; }

/* ===== Champ couleur : pastille + saisie hexadécimale ===== */
.ac-color {
  display: flex; align-items: stretch; height: 36px; overflow: hidden; min-width: 0;
  border: 1px solid var(--ac-input); border-radius: var(--ac-radius-md); background: var(--ac-card); box-shadow: var(--ac-shadow-xs);
  transition: border-color var(--ac-dur-fast) var(--ac-ease), box-shadow var(--ac-dur-fast) var(--ac-ease);
}
.ac-color:focus-within { border-color: var(--ac-ring); box-shadow: var(--ac-shadow-xs), 0 0 0 3px var(--ac-primary-ring); }
.ac-color--invalid, .ac-color--invalid:focus-within { border-color: var(--ac-destructive); }
.ac-color-swatch { position: relative; flex-shrink: 0; width: 38px; background: var(--ac-muted); border-right: 1px solid var(--ac-border-strong); cursor: pointer; }
.ac-color-swatch:focus-within { outline: 2px solid var(--ac-ring); outline-offset: -3px; }
.ac-color-swatch input { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: 0; opacity: 0; cursor: pointer; }
.ac-color-text {
  flex: 1; min-width: 0; padding: 0 12px; border: 0; outline: 0; background: transparent; color: var(--ac-foreground);
  font-family: inherit; font-size: var(--ac-fs-base); font-variant-numeric: tabular-nums;
}

/* ===== Éditeur de texte enrichi ===== */
.ac-editor {
  border: 1px solid var(--ac-input); border-radius: var(--ac-radius-md); background: var(--ac-card); box-shadow: var(--ac-shadow-xs);
  transition: border-color var(--ac-dur-fast) var(--ac-ease), box-shadow var(--ac-dur-fast) var(--ac-ease);
}
.ac-editor:focus-within { border-color: var(--ac-ring); box-shadow: var(--ac-shadow-xs), 0 0 0 3px var(--ac-primary-ring); }
.ac-editor-toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 2px; padding: 4px;
  background: var(--ac-background); border-bottom: 1px solid var(--ac-border); border-radius: var(--ac-radius-md) var(--ac-radius-md) 0 0;
}
.ac-editor-toolbar .ac-separator-v { margin: 4px 4px; }
.ac-editor-content { min-height: 180px; max-height: 420px; overflow-y: auto; padding: 12px 14px; outline: none; cursor: text; font-size: var(--ac-fs-base); }

/* ===== Aperçu d'image ===== */
.ac-image-preview {
  display: inline-flex; align-self: flex-start; max-width: 100%; padding: 4px; border: 1px solid var(--ac-border); border-radius: var(--ac-radius-lg); background: var(--ac-background);
}
.ac-image-preview img { display: block; max-width: 100%; max-height: 160px; border-radius: var(--ac-radius-md); object-fit: contain; }

/* ===== Avatar (initiales) ===== */
.ac-avatar {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%;
  background: var(--ac-secondary); border: 1px solid var(--ac-border); color: var(--ac-foreground);
  font-size: var(--ac-fs-xs); font-weight: var(--ac-fw-semibold); line-height: 1;
}
.ac-avatar-sm { width: 24px; height: 24px; font-size: 10px; }

/* ===== Liste déroulante avec recherche (Combobox / Command) ===== */
.ac-combobox { position: relative; }
.ac-popover {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 20; margin: 0; padding: 4px; list-style: none;
  max-height: 280px; overflow-y: auto; background: var(--ac-popover); border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-lg); box-shadow: var(--ac-shadow-md);
}
.ac-option { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: var(--ac-radius-md); cursor: pointer; font-size: var(--ac-fs-base); }
.ac-option[aria-selected="true"] { background: var(--ac-hover); }
.ac-option-main { display: flex; flex-direction: column; min-width: 0; line-height: var(--ac-lh-snug); }
.ac-option-main > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-option-sub { font-size: var(--ac-fs-xs); color: var(--ac-muted-foreground); }
.ac-popover-hint { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px 8px; text-align: center; font-size: var(--ac-fs-sm); color: var(--ac-muted-foreground); }
/* Élément choisi (administrateur sélectionné) */
.ac-chip {
  display: inline-flex; align-items: center; gap: 8px; max-width: 100%; padding: 3px 4px 3px 4px;
  border: 1px solid var(--ac-border-strong); border-radius: 999px; background: var(--ac-card); box-shadow: var(--ac-shadow-xs);
  font-size: var(--ac-fs-sm); font-weight: var(--ac-fw-medium);
}
.ac-chip-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-chip-x {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 24px; height: 24px; padding: 0;
  border: 0; border-radius: 50%; background: transparent; color: var(--ac-muted-foreground); cursor: pointer;
  transition: background-color var(--ac-dur-fast) var(--ac-ease), color var(--ac-dur-fast) var(--ac-ease);
}
.ac-chip-x:hover { background: var(--ac-hover); color: var(--ac-foreground); }
.ac-chip-x:focus-visible { outline: 2px solid var(--ac-ring); outline-offset: 1px; }

/* ===== États vides, squelettes, progression, chargement ===== */
.ac-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 48px 24px; text-align: center; }
.ac-empty--bordered { border: 1px dashed var(--ac-border-strong); border-radius: var(--ac-radius-card); background: var(--ac-card); }
.ac-empty-icon {
  display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; margin-bottom: 12px;
  border-radius: 50%; background: var(--ac-muted); color: var(--ac-muted-foreground);
}
.ac-empty-title { margin: 0; font-size: var(--ac-fs-md); font-weight: var(--ac-fw-semibold); line-height: var(--ac-lh-snug); }
.ac-empty-desc { margin: 0; max-width: 440px; font-size: var(--ac-fs-base); color: var(--ac-muted-foreground); }
.ac-empty-action { margin-top: 16px; }
@keyframes ac-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.ac-skeleton {
  display: block; min-height: 12px; border-radius: var(--ac-radius-md);
  background: linear-gradient(90deg, var(--ac-muted) 0%, var(--ac-border) 50%, var(--ac-muted) 100%);
  background-size: 200% 100%; animation: ac-shimmer 1.6s ease-in-out infinite;
}
.ac-skeleton-row { display: flex; align-items: center; gap: 16px; height: 52px; padding: 0 16px; border-bottom: 1px solid var(--ac-border); }
.ac-skeleton-row:last-child { border-bottom: 0; }
.ac-progress { height: 6px; overflow: hidden; border-radius: 999px; background: var(--ac-muted); }
.ac-progress-bar { height: 100%; border-radius: inherit; background: var(--ac-primary); transition: width var(--ac-dur) var(--ac-ease); }
@keyframes ac-spin { to { transform: rotate(360deg); } }
.ac-spinner {
  flex-shrink: 0; width: 16px; height: 16px; border: 2px solid var(--ac-border-strong);
  border-top-color: var(--ac-primary); border-radius: 50%; animation: ac-spin .7s linear infinite;
}
.ac-inline-status { display: inline-flex; align-items: center; gap: 8px; font-size: var(--ac-fs-sm); color: var(--ac-muted-foreground); }
.ac-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
.ac-scroll::-webkit-scrollbar-thumb { background: var(--ac-border-strong); border-radius: 999px; border: 3px solid transparent; background-clip: content-box; }
.ac-scroll::-webkit-scrollbar-track { background: transparent; }

/* ===== Toasts (façon Sonner) : en bas à droite, empilés ===== */
.ac-toasts {
  position: fixed; right: 16px; bottom: 16px; z-index: 2000; display: flex; flex-direction: column; gap: 8px;
  width: min(380px, calc(100vw - 32px)); pointer-events: none;
}
.ac-toast {
  pointer-events: auto; display: flex; align-items: flex-start; gap: 12px; padding: 14px 8px 14px 16px;
  background: var(--ac-popover); border: 1px solid var(--ac-border); border-radius: var(--ac-radius-lg); box-shadow: var(--ac-shadow-lg);
  font-size: var(--ac-fs-base); animation: ac-toast-in var(--ac-dur) var(--ac-ease); overflow-wrap: anywhere;
}
@keyframes ac-toast-in { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
.ac-toast-icon { flex-shrink: 0; margin-top: 1px; }
.ac-toast-success .ac-toast-icon { color: var(--ac-success); }
.ac-toast-error .ac-toast-icon { color: var(--ac-destructive); }
.ac-toast-body { flex: 1; min-width: 0; }
.ac-toast-title { font-weight: var(--ac-fw-semibold); line-height: var(--ac-lh-snug); }
.ac-toast-desc { margin-top: 2px; font-size: var(--ac-fs-sm); line-height: var(--ac-lh-snug); color: var(--ac-muted-foreground); }

/* ===== Contenu HTML riche (pop-up de publication, éditeur) ===== */
.ac-prose { font-size: 15px; line-height: var(--ac-lh-relaxed); color: var(--ac-foreground); overflow-wrap: anywhere; }
.ac-prose > :first-child { margin-top: 0; }
.ac-prose > :last-child { margin-bottom: 0; }
.ac-prose p { margin: 0 0 1em; }
.ac-prose h1, .ac-prose h2 { margin: 1.6em 0 0.5em; font-size: var(--ac-fs-xl); font-weight: var(--ac-fw-semibold); line-height: var(--ac-lh-tight); letter-spacing: -0.015em; }
.ac-prose h3 { margin: 1.5em 0 0.4em; font-size: 17px; font-weight: var(--ac-fw-semibold); line-height: var(--ac-lh-tight); letter-spacing: -0.01em; }
.ac-prose h4, .ac-prose h5, .ac-prose h6 { margin: 1.4em 0 0.4em; font-size: 15px; font-weight: var(--ac-fw-semibold); line-height: var(--ac-lh-tight); }
.ac-prose strong, .ac-prose b { font-weight: var(--ac-fw-semibold); }
.ac-prose a {
  color: var(--ac-primary); font-weight: var(--ac-fw-medium); text-decoration: underline;
  text-decoration-color: var(--ac-primary-ring); text-decoration-thickness: 1px; text-underline-offset: 3px;
  transition: text-decoration-color var(--ac-dur-fast) var(--ac-ease);
}
.ac-prose a:hover { text-decoration-color: var(--ac-primary); text-decoration-thickness: 2px; }
.ac-prose ul, .ac-prose ol { margin: 0 0 1em; padding-left: 1.5em; }
.ac-prose ul { list-style: disc; }
.ac-prose li { margin: 0.3em 0; padding-left: 0.2em; }
.ac-prose li::marker { color: var(--ac-subtle-foreground); }
.ac-prose blockquote { margin: 1.25em 0; padding: 2px 0 2px 16px; border-left: 2px solid var(--ac-border-strong); color: var(--ac-muted-foreground); }
.ac-prose hr { margin: 1.6em 0; border: 0; border-top: 1px solid var(--ac-border); }
.ac-prose img { max-width: 100%; height: auto; border: 1px solid var(--ac-border); border-radius: var(--ac-radius-lg); }
.ac-prose code { padding: 0.15em 0.4em; border-radius: 4px; background: var(--ac-muted); font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 0.875em; }
/* Énigmes et quiz : <details> en accordéon */
.ac-prose details { margin: 0 0 8px; border: 1px solid var(--ac-border); border-radius: var(--ac-radius-lg); background: var(--ac-card); }
.ac-prose summary {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px;
  cursor: pointer; list-style: none; font-weight: var(--ac-fw-medium); border-radius: var(--ac-radius-lg);
}
.ac-prose summary::-webkit-details-marker { display: none; }
.ac-prose summary::after {
  content: ""; flex-shrink: 0; width: 16px; height: 16px; background: ${chevronDown(T.textSubtle)} center / 16px no-repeat;
  transition: transform var(--ac-dur) var(--ac-ease);
}
.ac-prose summary:hover { background: var(--ac-background); }
.ac-prose summary:focus-visible { outline: 2px solid var(--ac-ring); outline-offset: 2px; }
.ac-prose details[open] > summary { border-bottom: 1px solid var(--ac-border); border-radius: var(--ac-radius-lg) var(--ac-radius-lg) 0 0; }
.ac-prose details[open] > summary::after { transform: rotate(180deg); }
.ac-prose details > :not(summary) { margin-left: 16px; margin-right: 16px; }
.ac-prose details > summary + * { margin-top: 12px; }
.ac-prose details > :last-child:not(summary) { margin-bottom: 12px; }

@media (prefers-reduced-motion: reduce) {
  .ac-overlay--open, .ac-modal--open, .ac-toast, .ac-skeleton { animation: none; }
  .ac-switch-track, .ac-switch-track::after, .ac-progress-bar, .ac-prose summary::after { transition: none; }
  .ac-spinner, .ac-btn[aria-busy="true"]::before { animation-duration: 1.8s; }
}
`;

/** Barre de titre (ToolHeader), barre de filtres et sélecteur d'année. */
const SHELL_CSS = `
/* ===== Barre de titre (ToolHeader) : 60 px, collante, bordure basse fine ===== */
.ac-toolbar {
  display: flex; align-items: stretch; justify-content: space-between; gap: 16px;
  padding: 0 24px; background: var(--ac-card); border-bottom: 1px solid var(--ac-border);
  min-height: 60px; flex-shrink: 0; position: sticky; top: 0; z-index: 100;
}
.ac-toolbar-left { display: flex; align-items: stretch; gap: 8px; min-width: 0; }
.ac-toolbar-brand { display: flex; align-items: center; gap: 12px; padding-right: 16px; min-width: 0; }
.ac-toolbar-title {
  font-family: var(--ac-font-display); font-size: var(--ac-fs-md); font-weight: var(--ac-fw-semibold);
  letter-spacing: -0.01em; line-height: var(--ac-lh-tight); color: var(--ac-foreground); white-space: nowrap;
}
.ac-toolbar-subtitle { margin-top: 2px; font-size: var(--ac-fs-xs); color: var(--ac-muted-foreground); white-space: nowrap; }
.ac-toolbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
/* Pastille de l'application devant le titre (icône sur fond primaire) */
.ac-toolbar-logo {
  width: 32px; height: 32px; border-radius: var(--ac-radius-md); flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--ac-primary); color: var(--ac-primary-foreground);
}

/* ===== Barre de filtres horizontale (onglet Publications) ===== */
.ac-filterbar {
  container-type: inline-size; container-name: ac-filterbar;
  display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
}
.ac-filterbar-search { flex: 1 1 240px; min-width: 180px; max-width: 320px; }
.ac-filterbar-end { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.ac-filterbar-count { font-size: var(--ac-fs-sm); color: var(--ac-muted-foreground); white-space: nowrap; font-variant-numeric: tabular-nums; }

/* ===== Sélecteur d'année (YearSelect) ===== */
.ac-year {
  position: relative; height: 36px; display: inline-flex; align-items: center; gap: 8px;
  padding: 0 0 0 12px; border: 1px solid var(--ac-input); border-radius: var(--ac-radius-md); background: var(--ac-card);
  color: var(--ac-muted-foreground); box-shadow: var(--ac-shadow-xs); cursor: pointer;
  transition: border-color var(--ac-dur-fast) var(--ac-ease), box-shadow var(--ac-dur-fast) var(--ac-ease);
}
.ac-year:hover { border-color: var(--ac-input-hover); }
.ac-year:focus-within { border-color: var(--ac-ring); box-shadow: var(--ac-shadow-xs), 0 0 0 3px var(--ac-primary-ring); }
.ac-year-label { font-size: var(--ac-fs-sm); font-weight: var(--ac-fw-medium); }
.ac-year-select {
  -webkit-appearance: none; appearance: none; border: 0; background: transparent; outline: none;
  height: 100%; padding: 0 32px 0 0; cursor: pointer;
  font-family: inherit; font-size: var(--ac-fs-base); font-weight: var(--ac-fw-medium); color: var(--ac-foreground);
  font-variant-numeric: tabular-nums;
}
.ac-year-select option { color: var(--ac-foreground); font-weight: var(--ac-fw-normal); }
.ac-year-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }
`;

export const GLOBAL_CSS = TOKENS_CSS + BASE_CSS + SHELL_CSS;
