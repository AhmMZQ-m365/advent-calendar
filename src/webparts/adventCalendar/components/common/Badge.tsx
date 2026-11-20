import * as React from 'react';

export type BadgeVariant = 'outline' | 'success' | 'warning';

export interface IBadgeProps {
  variant: BadgeVariant;
  /** Pastille de couleur devant le libellé (états : publié, brouillon…). */
  dot?: boolean;
  children: React.ReactNode;
}

/** Badge (`.ac-badge-*`) : statut ou étiquette courte. Ne porte jamais l'information par la couleur seule : toujours un libellé. */
export const Badge: React.FC<IBadgeProps> = ({ variant, dot, children }) => (
  <span className={`ac-badge ac-badge-${variant}${dot ? ' ac-badge-dot' : ''}`}>{children}</span>
);
