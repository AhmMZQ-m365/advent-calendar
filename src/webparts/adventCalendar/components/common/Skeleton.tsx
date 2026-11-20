import * as React from 'react';

export interface ISkeletonProps {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

/** Bloc de chargement (`.ac-skeleton`) : décoratif, le message d'état est porté par le conteneur (`Loader`). */
export const Skeleton: React.FC<ISkeletonProps> = ({ width, height = 12, style }) => (
  <span className="ac-skeleton" aria-hidden="true" style={{ width, height, ...style }} />
);
