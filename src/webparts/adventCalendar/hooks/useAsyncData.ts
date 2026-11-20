import * as React from 'react';
import { getErrorMessage } from '../services/format';

export interface IAsyncData<T> {
  data: T | undefined;
  isLoading: boolean;
  error: string | undefined;
  reload: () => void;
}

/**
 * Charge une donnée asynchrone et expose les états de chargement / erreur.
 * Les réponses arrivant après démontage ou après un rechargement plus récent sont ignorées.
 * `loader` est relancé quand `deps` change ou quand `reload()` est appelé ; `enabled=false` suspend le chargement.
 */
export function useAsyncData<T>(loader: () => Promise<T>, deps: React.DependencyList, enabled: boolean = true): IAsyncData<T> {
  const [data, setData] = React.useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(enabled);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [reloadToken, setReloadToken] = React.useState<number>(0);

  React.useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return undefined;
    }
    let isCurrent = true;
    setIsLoading(true);
    setError(undefined);
    loader()
      .then((result) => {
        if (isCurrent) {
          setData(result);
        }
      })
      .catch((reason: unknown) => {
        if (isCurrent) {
          setError(getErrorMessage(reason));
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });
    return () => {
      isCurrent = false;
    };
    // `deps` est fourni par l'appelant (même principe que useEffect).
  }, [...deps, enabled, reloadToken]);

  const reload = React.useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, isLoading, error, reload };
}
