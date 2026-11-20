import * as React from 'react';
import { Icon, IconName } from '../../theme/Icons';

export interface IEmptyStateProps {
  icon: IconName;
  title: string;
  description?: string;
  /** Action proposée (bouton) : un état vide est une invitation à agir. */
  action?: React.ReactNode;
  /** Cadre en tirets (zone vide autonome) plutôt que contenu dans une carte. */
  bordered?: boolean;
}

/** État vide : icône dans un cercle neutre, titre, description et action éventuelle (`.ac-empty*`). */
export const EmptyState: React.FC<IEmptyStateProps> = ({ icon, title, description, action, bordered }) => (
  <div className={`ac-empty${bordered ? ' ac-empty--bordered' : ''}`}>
    <span className="ac-empty-icon" aria-hidden="true"><Icon name={icon} size={22} /></span>
    <h3 className="ac-empty-title">{title}</h3>
    {description && <p className="ac-empty-desc">{description}</p>}
    {action && <div className="ac-empty-action">{action}</div>}
  </div>
);
