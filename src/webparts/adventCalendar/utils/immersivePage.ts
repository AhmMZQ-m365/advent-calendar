/**
 * Affichage « plein écran » de la page SharePoint qui héberge la web part :
 * - masque le bandeau Microsoft 365 du haut (`#SuiteNavPlaceholder` : lanceur
 *   d'applications, recherche, paramètres, photo de profil) ;
 * - masque la barre d'applications Microsoft 365 à gauche (Découvrir, Publier,
 *   Créer, OneDrive) ;
 * - masque la barre de commandes de la page (bouton « Modifier », flèches
 *   « Masquer / Afficher la navigation et l'en-tête », partage…) ;
 * - active le mode Focus de la page (bouton « Masquer la navigation et
 *   l'en-tête »), une seule fois au chargement — le clic reste possible même
 *   si la barre de commandes est masquée.
 *
 * Ce sont des sélecteurs du DOM SharePoint, non documentés : si Microsoft les
 * renomme, rien ne casse (la barre reste simplement visible / le clic n'a
 * pas lieu). Ne s'applique qu'en mode lecture, jamais en édition.
 *
 * Échappatoire pour les éditeurs (le bouton « Modifier » étant masqué) :
 * ajouter `?chrome=1` à l'adresse de la page affiche la page SharePoint
 * normale ; on peut aussi passer directement en édition avec `?Mode=Edit`.
 *
 * Renvoie une fonction de nettoyage à appeler dans `onDispose` : tout
 * réapparaît quand on navigue vers une autre page du site.
 */

const STYLE_ID = "ac-immersive-page";
const FOCUS_BTN = '[data-automationid="pageCommandBarFocusModeButton"]';
const HIDDEN_CSS = `
#SuiteNavPlaceholder,
#sp-appBar { display: none !important; }
.commandBarWrapper,
[data-automationid="pageCommandBar"],
[data-automation-id="pageCommandBar"],
${FOCUS_BTN} { display: none !important; }
`;
/** Paramètre d'URL qui désactive le plein écran (page SharePoint normale). */
const BYPASS_PARAM = /[?&]chrome=1(&|$)/i;
/** Le bouton n'apparaît qu'une fois la barre de commandes rendue : on l'attend au plus 10 s. */
const FOCUS_WAIT_MS = 10000;

/** true = l'en-tête et la navigation sont encore visibles, il faut cliquer. */
function isNotFocused(btn: HTMLElement): boolean {
  const label = (btn.getAttribute("aria-label") || btn.getAttribute("name") || "").toLowerCase();
  const icon = btn.querySelector("i[data-icon-name]")?.getAttribute("data-icon-name");
  return label.indexOf("masquer") === 0 || label.indexOf("hide") === 0 || icon === "FullScreen";
}

export function applyImmersivePage(): () => void {
  if (BYPASS_PARAM.test(window.location.search)) return () => undefined;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = HIDDEN_CSS;
    document.head.appendChild(style);
  }

  let observer: MutationObserver | undefined;
  let timeout: number | undefined;

  const tryFocus = (): boolean => {
    const btn = document.querySelector<HTMLElement>(FOCUS_BTN);
    if (!btn) return false;
    if (isNotFocused(btn)) btn.click();
    return true;
  };

  if (!tryFocus()) {
    observer = new MutationObserver(() => {
      if (tryFocus()) observer?.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    timeout = window.setTimeout(() => observer?.disconnect(), FOCUS_WAIT_MS);
  }

  return () => {
    observer?.disconnect();
    window.clearTimeout(timeout);
    document.getElementById(STYLE_ID)?.remove();
  };
}
