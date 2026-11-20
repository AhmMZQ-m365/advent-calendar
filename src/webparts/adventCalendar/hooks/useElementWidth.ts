import * as React from 'react';

/**
 * Largeur (px, arrondie) d'un élément, suivie par ResizeObserver : la mise en page s'adapte à la place réellement
 * disponible (colonne étroite d'une page SharePoint), pas à la fenêtre. Repli sur l'événement `resize` de la fenêtre si
 * ResizeObserver n'existe pas. La première mesure a lieu avant la première peinture (pas de scintillement).
 * Retourne la référence à poser sur l'élément et sa largeur (0 tant que non mesurée).
 */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }
    const update = (): void => setWidth(Math.round(element.getBoundingClientRect().width));
    update();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return [ref, width];
}
