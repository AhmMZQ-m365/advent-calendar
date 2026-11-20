/**
 * Adaptation à la taille d'écran. Injecté APRÈS GLOBAL_CSS : à spécificité égale, ces règles gagnent.
 *
 * Requêtes MEDIA (largeur de la fenêtre) et non de conteneur : un `container-type` sur la racine en ferait le bloc
 * de positionnement des éléments `position: fixed` (Modal, toasts), qui ne seraient plus centrés à l'écran.
 * En mode plein écran le web part occupe toute la largeur de la fenêtre ; le repli sapin → grille, lui, reste une
 * requête de conteneur (AdventCalendar.module.scss). Tout est scopé sous `.adv-app` (racine du web part).
 */
export const RESPONSIVE_CSS = `
/* Zones de contenu (marges en classe pour pouvoir les réduire) */
.adv-app .adv-main {
  flex: 1; width: 100%; max-width: 1440px; min-width: 0; margin: 0 auto;
  padding: 24px; display: flex; flex-direction: column; gap: 16px;
}
/* Pages d'administration : largeur de lecture confortable */
.adv-app .adv-main--narrow { max-width: 1320px; }
/* Très grands écrans : le calendrier ne s'étire pas au-delà d'une largeur confortable */
.adv-app .adv-calendar-surface { width: 100%; max-width: 1440px; margin: 0 auto; }
/* Tableaux : largeur minimale lisible, défilement horizontal dans leur cadre */
.adv-app .adv-table { min-width: 560px; }
.adv-app .adv-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }

/* ===== Barre de filtres : s'adapte à SA largeur (container-type posé sur la barre, aucun overlay dedans) ===== */
@container ac-filterbar (max-width: 760px) {
  .adv-app .ac-filterbar-search { flex: 1 1 100%; max-width: none; order: 3; }
  .adv-app .ac-segmented { order: 4; }
  .adv-app .ac-filterbar-end { order: 2; }
}
@container ac-filterbar (max-width: 480px) {
  .adv-app .ac-segmented { width: 100%; }
  .adv-app .ac-segmented-btn { flex: 1 1 auto; }
  .adv-app .ac-filterbar-end { margin-left: 0; width: 100%; justify-content: space-between; order: 5; }
}

/* ===== Barre de titre : s'adapte à SA largeur (web part dans une colonne étroite d'une page), pas à la fenêtre.
   Exception sûre à la règle « pas de container-type » : la barre ne contient que des boutons, aucun overlay. ===== */
.adv-app .ac-toolbar { container-type: inline-size; container-name: ac-toolbar; flex-wrap: wrap; }
@container ac-toolbar (max-width: 720px) {
  .adv-app .ac-toolbar-left { flex-wrap: wrap; width: 100%; }
  .adv-app .ac-toolbar-brand { padding-right: 0; min-height: 56px; }
  .adv-app .ac-toolbar-title { white-space: normal; }
  .adv-app .ac-toolbar-subtitle { white-space: normal; }
  .adv-app .ac-toolbar-left > [role="tablist"] { width: 100%; overflow-x: auto; }
  .adv-app .ac-tab { min-height: 44px; white-space: nowrap; }
  .adv-app .ac-tab::after { bottom: 0; }
  .adv-app .ac-toolbar-right { width: 100%; justify-content: flex-end; flex-wrap: wrap; padding-bottom: 8px; }
}
@container ac-toolbar (max-width: 480px) {
  .adv-app .ac-toolbar-right > * { flex: 1 1 auto; }
  .adv-app .ac-toolbar-right .ac-btn { width: 100%; }
}

/* ===== Mobile : barre de titre non collante, marges réduites ===== */
@media (max-width: 720px) {
  .adv-app .ac-toolbar { position: static; gap: 8px; padding: 0 12px; }
  .adv-app .adv-main { padding: 12px; gap: 12px; }
  .adv-app .ac-card-header { padding: 16px 16px 0; }
  .adv-app .ac-card-content { padding: 16px; }
}

/* ===== Écrans tactiles et mobiles : cibles d'au moins 40 px ===== */
@media (max-width: 720px), (pointer: coarse) {
  .adv-app .ac-btn { min-height: 40px; }
  .adv-app .ac-icon-btn { width: 40px; height: 40px; }
  .adv-app .ac-icon-btn-sm { width: 36px; height: 36px; }
  .adv-app .ac-input, .adv-app .ac-select, .adv-app .ac-year, .adv-app .ac-color { height: 40px; }
  .adv-app .ac-segmented-btn { height: 34px; }
  .adv-app .ac-chip-x { width: 32px; height: 32px; }
  .adv-app .ac-option { min-height: 44px; }
  .adv-app .ac-table td { height: 56px; }
  .adv-app .ac-input, .adv-app .ac-select, .adv-app .ac-color-text { font-size: 16px; }
}

/* ===== Petit téléphone : toasts sur toute la largeur ===== */
@media (max-width: 480px) {
  .adv-app .ac-toasts { left: 12px; right: 12px; bottom: 12px; width: auto; }
}
`;
