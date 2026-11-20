import * as React from 'react';

/**
 * Mises en page statiques partagées (flex, espacements sur la grille de 4 px).
 * Tout le reste (cartes, badges, champs, tableaux…) vient des classes `ac-` de GLOBAL_CSS (theme/globalStyles.ts).
 */
export const a: Record<string, React.CSSProperties> = {
  // Zones .adv-main : classe de theme/responsiveStyles.ts (marges adaptées à la largeur).
  stack: { display: 'flex', flexDirection: 'column', gap: '16px' },
  row: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' },
  footerSpread: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }
};
