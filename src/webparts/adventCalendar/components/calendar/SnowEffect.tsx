import * as React from 'react';
import styles from '../AdventCalendar.module.scss';

const FLAKE_COUNT = 44;

interface IFlake {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

/** Pseudo-aléatoire déterministe : la neige est identique d'un rendu à l'autre. */
function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Neige purement CSS (transformations accélérées par le GPU), décorative : petits flocons lents, gros flocons plus
 * rapides et légèrement flous. Couleur = `--adv-snow` (posée par le conteneur) ; désactivée si l'utilisateur préfère
 * réduire les animations. Le conteneur doit être positionné (position: relative).
 */
export const SnowEffect: React.FC = () => {
  const flakes = React.useMemo<IFlake[]>(
    () => Array.from({ length: FLAKE_COUNT }, (_, index) => {
      const size = 3 + seeded(index, 2) * 6;
      return {
        left: seeded(index, 1) * 100,
        size,
        // Plus un flocon est gros, plus il est proche et tombe vite.
        duration: 16 - size * 0.9 + seeded(index, 3) * 6,
        delay: -seeded(index, 4) * 20,
        drift: (seeded(index, 5) - 0.5) * 80
      };
    }),
    []
  );

  return (
    <div className={styles.snow} aria-hidden="true">
      {flakes.map((flake, index) => (
        <span
          key={index}
          className={flake.size > 6.5 ? `${styles.snowFlake} ${styles.snowFlakeSoft}` : styles.snowFlake}
          style={{
            left: `${flake.left}%`,
            width: flake.size,
            height: flake.size,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
            ['--adv-drift' as string]: `${flake.drift}px`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
