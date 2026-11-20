import * as React from 'react';

/** Identifiant aléatoire stable (par instance de composant), pour relier un libellé à son champ (aria-labelledby, htmlFor…). */
export function useFieldId(prefix: string): string {
  return React.useRef(`${prefix}-${Math.random().toString(36).slice(2)}`).current;
}
