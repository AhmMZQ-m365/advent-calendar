import * as React from 'react';

export interface IErrorBoundaryProps {
  /** Contenu de remplacement ; `reset` relance le rendu des enfants. */
  fallback: (error: Error, reset: () => void) => React.ReactNode;
  children: React.ReactNode;
}

interface IErrorBoundaryState {
  error: Error | undefined;
}

/** Intercepte les erreurs de rendu (ex. chargement d'un chunk impossible) pour ne pas faire tomber tout le web part. */
export class ErrorBoundary extends React.Component<IErrorBoundaryProps, IErrorBoundaryState> {
  public state: IErrorBoundaryState = { error: undefined };

  public static getDerivedStateFromError(error: Error): IErrorBoundaryState {
    return { error };
  }

  public render(): React.ReactNode {
    const { error } = this.state;
    return error ? this.props.fallback(error, this._reset) : this.props.children;
  }

  private _reset = (): void => {
    this.setState({ error: undefined });
  };
}
