import * as React from "react";

/**
 * Jeu d'icônes SVG inline, dessiné dans le style de Lucide (grille 24, trait 1,75, extrémités et jointures arrondies,
 * aucun remplissage). Tracés originaux du projet : aucune icône tierce n'est reprise, donc aucune notice de licence.
 * Tout est en `stroke: currentColor` → l'icône hérite de la couleur du texte parent.
 */
export type IconName =
  | "calendar"
  | "check-circle"
  | "add"
  | "arrow-left"
  | "edit"
  | "save"
  | "reset"
  | "lock"
  | "close"
  | "list"
  | "search"
  | "check"
  | "chevron-down"
  | "upload"
  | "alert"
  | "external"
  | "sparkles"
  | "trash"
  // Ajouts Calendrier de l'Avent (éditeur de texte, profils, sécurité)
  | "bold"
  | "italic"
  | "underline"
  | "list-ordered"
  | "link"
  | "unlink"
  | "eraser"
  | "star"
  | "shield"
  | "gift"
  // Alertes, états vides, onglets
  | "info"
  | "circle-alert"
  | "users";

const PATHS: Record<IconName, React.ReactNode> = {
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </>
  ),
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  add: <path d="M12 5v14M5 12h14" />,
  "arrow-left": <path d="M19 12H5M12 19l-7-7 7-7" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </>
  ),
  save: (
    <>
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </>
  ),
  reset: (
    <>
      <path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3M3 4v4h4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  sparkles: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.5-4.5" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5L19.5 7" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 19h16" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
    </>
  ),
  bold: <path d="M7 4h6a4 4 0 010 8H7zM7 12h7a4 4 0 010 8H7z" />,
  italic: <path d="M19 4h-9M14 20H5M15 4L9 20" />,
  underline: <path d="M6 3v7a6 6 0 0012 0V3M4 21h16" />,
  "list-ordered": <path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />,
  link: <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5" />,
  unlink: <path d="M18.84 12.25l1.72-1.71a5 5 0 00-7.07-7.07l-1.72 1.71M5.17 11.75l-1.71 1.71a5 5 0 007.07 7.07l1.71-1.71M8 2v3M2 8h3M16 22v-3M22 16h-3" />,
  eraser: <path d="M20 20H9L4 15a2 2 0 010-2.83l9.17-9.17a2 2 0 012.83 0l4 4a2 2 0 010 2.83L12 18M7 11l6 6" />,
  star: <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4" />,
  gift: (
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v9h14v-9M12 8v13M12 8H8.5a2.5 2.5 0 110-5C11 3 12 8 12 8zM12 8h3.5a2.5 2.5 0 100-5C13 3 12 8 12 8z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  "circle-alert": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0113 0" />
      <path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.3A6.5 6.5 0 0121.5 20" />
    </>
  ),
};

export interface IIconProps {
  name: IconName;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const Icon: React.FC<IIconProps> = ({
  name,
  size = 20,
  style,
  className,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    style={{ flexShrink: 0, ...style }}
  >
    {PATHS[name]}
  </svg>
);
