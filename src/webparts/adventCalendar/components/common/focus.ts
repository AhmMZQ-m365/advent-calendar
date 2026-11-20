const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]';

/**
 * Éléments atteignables au clavier (Tab) dans un conteneur, dans l'ordre du DOM : visibles, hors `tabindex="-1"`
 * (champ date caché, segments inactifs d'un radiogroup…). Sert au piège de focus des boîtes de dialogue.
 */
export function getTabStops(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) =>
      element.getAttribute('tabindex') !== '-1'
      && element.getClientRects().length > 0
      && window.getComputedStyle(element).visibility !== 'hidden'
  );
}

/**
 * Index à sélectionner après une touche de navigation d'un groupe à focus itinérant (onglets, radiogroup) :
 * flèches (gauche/droite seulement avec `'horizontal'`, haut/bas aussi avec `'both'`), Début et Fin ; boucle aux extrémités.
 * Renvoie `undefined` si la touche n'est pas gérée.
 */
export function nextRovingIndex(key: string, index: number, count: number, arrows: 'horizontal' | 'both'): number | undefined {
  const last = count - 1;
  switch (key) {
    case 'ArrowRight':
      return index === last ? 0 : index + 1;
    case 'ArrowDown':
      return arrows === 'both' ? (index === last ? 0 : index + 1) : undefined;
    case 'ArrowLeft':
      return index === 0 ? last : index - 1;
    case 'ArrowUp':
      return arrows === 'both' ? (index === 0 ? last : index - 1) : undefined;
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return undefined;
  }
}
