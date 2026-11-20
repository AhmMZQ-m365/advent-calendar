import * as React from "react";
import { Icon } from "../../theme/Icons";

export interface IToolHeaderProps {
  /** Titre de l'outil. */
  title: string;
  /** Ligne secondaire optionnelle sous le titre (compteur de résultats, etc.). */
  subtitle?: string;
  /** Contenu inséré à droite du titre, dans la zone gauche : onglets de l'outil. */
  children?: React.ReactNode;
  /** Actions alignées à droite (boutons). */
  actions?: React.ReactNode;
  /** Affiche la pastille de l'application (icône cadeau sur fond primaire) devant le titre. */
  showLogo?: boolean;
}

/**
 * Barre du haut : pastille, titre (+ sous-titre), onglets, actions à droite. 60 px, collante, bordure basse fine.
 * Les styles vivent dans `GLOBAL_CSS` (`.ac-toolbar*`, `.ac-tabs`, `.ac-tab`).
 */
export const ToolHeader: React.FC<IToolHeaderProps> = ({
  title,
  subtitle,
  children,
  actions,
  showLogo,
}) => (
  <nav className="ac-toolbar">
    <div className="ac-toolbar-left">
      <div className="ac-toolbar-brand">
        {showLogo && (
          <span className="ac-toolbar-logo" aria-hidden="true">
            <Icon name="gift" size={18} />
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <div className="ac-toolbar-title">{title}</div>
          {subtitle && <div className="ac-toolbar-subtitle">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>

    <div className="ac-toolbar-right">
      {actions}
    </div>
  </nav>
);
