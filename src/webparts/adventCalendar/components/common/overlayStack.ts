/**
 * Pile des overlays ouverts (modales + drawers), partagée au niveau module :
 * seule la surface du DESSUS réagit à la touche Échap.
 */
const stack: string[] = [];

export function pushOverlay(id: string): void {
  stack.push(id);
}

export function popOverlay(id: string): void {
  const idx = stack.indexOf(id);
  if (idx >= 0) stack.splice(idx, 1);
}

export function isTopOverlay(id: string): boolean {
  return stack[stack.length - 1] === id;
}

/**
 * `true` si une modale ou un drawer est ouvert.
 *
 * Le menu global se ferme aussi sur Échap, mais il n'est pas un overlay : sans
 * ce garde-fou, une seule pression fermerait à la fois la modale du dessus et
 * le menu, alors que l'utilisateur ne visait que la modale.
 */
export function hasOpenOverlay(): boolean {
  return stack.length > 0;
}
