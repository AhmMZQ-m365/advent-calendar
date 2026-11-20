import * as React from 'react';
import { Skeleton } from './Skeleton';

/** Forme du squelette : panneau générique, calendrier (scène 16:9) ou tableau. */
export type LoaderShape = 'panel' | 'calendar' | 'table';

export interface ILoaderProps {
  /** Message lu par les lecteurs d'écran (et affiché en mode `inline`). */
  label: string;
  /** Variante compacte (spinner + texte, en ligne) ; sinon un squelette remplace le contenu à venir. */
  inline?: boolean;
  shape?: LoaderShape;
}

const TABLE_ROWS = 6;

/** Chargement : squelette pour les blocs (liste, tableau, calendrier), spinner pour les actions en ligne. */
export const Loader: React.FC<ILoaderProps> = ({ label, inline, shape = 'panel' }) => {
  if (inline) {
    return (
      <span className="ac-inline-status" role="status" aria-live="polite">
        <span className="ac-spinner" aria-hidden="true" />
        {label}
      </span>
    );
  }

  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="ac-sr-only">{label}</span>
      {shape === 'calendar' && (
        <div className="ac-card adv-calendar-surface" style={{ padding: 16 }}>
          <Skeleton width="100%" style={{ aspectRatio: '16 / 9', height: 'auto', borderRadius: 12 }} />
        </div>
      )}
      {shape === 'table' && (
        <div className="ac-card ac-card-clip">
          {Array.from({ length: TABLE_ROWS }, (_, index) => (
            <div key={index} className="ac-skeleton-row">
              <Skeleton width={32} />
              <Skeleton style={{ flex: 1 }} />
              <Skeleton width={96} />
              <Skeleton width={72} height={20} style={{ borderRadius: 999 }} />
            </div>
          ))}
        </div>
      )}
      {shape === 'panel' && (
        <div className="ac-card ac-card-content">
          <Skeleton width="30%" height={16} />
          <Skeleton width="100%" />
          <Skeleton width="85%" />
          <Skeleton width="60%" />
        </div>
      )}
    </div>
  );
};
