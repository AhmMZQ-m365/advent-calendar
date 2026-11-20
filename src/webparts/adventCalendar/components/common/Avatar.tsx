import * as React from 'react';

export interface IAvatarProps {
  /** Nom complet : les initiales (deux lettres au plus) en sont déduites. */
  name: string;
  /** `sm` = 24 px (listes déroulantes, pastilles) ; `md` = 32 px (défaut). */
  size?: 'sm' | 'md';
}

/** Initiales d'un nom (« Dupont, Marie » → « DM »). */
export function getInitials(name: string): string {
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Pastille d'initiales (`.ac-avatar`), décorative : le nom est toujours présent à côté en texte. */
export const Avatar: React.FC<IAvatarProps> = ({ name, size = 'md' }) => (
  <span className={`ac-avatar${size === 'sm' ? ' ac-avatar-sm' : ''}`} aria-hidden="true">
    {getInitials(name)}
  </span>
);
