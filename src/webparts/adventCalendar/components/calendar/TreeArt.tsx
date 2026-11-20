import * as React from 'react';
import styles from './TreeScene.module.scss';
import { SceneStyle } from '../../models/IThemeProfile';
import { ISceneView, ITreeLayout, starPath, tierPath, tierSnowPath } from '../../defaults/tree/treeLayout';

export interface ITreeArtProps {
  /** Géométrie du format affiché (paysage, moyen ou portrait). */
  layout: ITreeLayout;
  /** Zone du dessin affichée (repère entier ou sapin seul). */
  view: ISceneView;
  sceneStyle: SceneStyle;
  /** Lumières de la guirlande (sinon simples perles). */
  garlandLights: boolean;
  /** Nombre de couleurs de la palette des boules (rotation des couleurs des lumières et des cadeaux). */
  baubleCount: number;
}

const fillOf = (color: string): React.CSSProperties => ({ fill: color });

/** Couleur de la boule n° `index` (1 = première), en rotation sur la palette du profil. */
function baubleVar(index: number, count: number, suffix = ''): string {
  return `var(--adv-bauble-${((index - 1) % count) + 1}${suffix})`;
}

/** Identifiant unique par instance : plusieurs scènes (aperçus) cohabitent sur la page, chacune avec ses propres couleurs. */
function useUid(): string {
  return React.useRef(`adv-art-${Math.random().toString(36).slice(2, 9)}`).current;
}

/** Paquet cadeau : corps, couvercle, ruban et nœud (couleurs de la palette des boules). */
const Gift: React.FC<{ x: number; y: number; w: number; h: number; color: number; count: number }> = ({ x, y, w, h, color, count }) => {
  const lid = Math.round(h * 0.24);
  const ribbon = Math.max(8, Math.round(w * 0.16));
  const cx = x + w / 2;
  return (
    <g>
      <rect x={x} y={y + lid} width={w} height={h - lid} rx={3} style={fillOf(baubleVar(color, count))} />
      <rect x={x + w - 12} y={y + lid} width={12} height={h - lid} rx={3} style={fillOf(baubleVar(color, count, '-lo'))} />
      <rect x={x - 4} y={y} width={w + 8} height={lid} rx={4} style={fillOf(baubleVar(color, count, '-hi'))} />
      <rect x={cx - ribbon / 2} y={y} width={ribbon} height={h} style={fillOf('var(--adv-star)')} />
      <ellipse cx={cx - 11} cy={y - 5} rx={13} ry={8} transform={`rotate(-22 ${cx - 11} ${y - 5})`} style={fillOf('var(--adv-star-dark)')} />
      <ellipse cx={cx + 11} cy={y - 5} rx={13} ry={8} transform={`rotate(22 ${cx + 11} ${y - 5})`} style={fillOf('var(--adv-star-dark)')} />
      <circle cx={cx} cy={y - 2} r={5} style={fillOf('var(--adv-star)')} />
    </g>
  );
};

/** Petit sapin lointain : deux étages empilés, teinte tirée du feuillage et du ciel. */
function pinePath(x: number, h: number, w: number, baseY: number): string {
  return `M ${x - w} ${baseY} L ${x} ${baseY - h * 0.68} L ${x + w} ${baseY} Z M ${x - w * 0.72} ${baseY - h * 0.36} L ${x} ${baseY - h} L ${x + w * 0.72} ${baseY - h * 0.36} Z`;
}

/**
 * Dessin SVG vectoriel de la scène : ciel (selon le décor), collines et neige, sapin à étages, guirlande, étoile
 * et cadeaux. Purement décoratif (aria-hidden) ; les 24 boules cliquables sont des boutons HTML posés par-dessus.
 * Toutes les couleurs sont des variables `--adv-*` du profil (ThemeService.getThemeCssVariables).
 */
export const TreeArt: React.FC<ITreeArtProps> = ({ layout, view, sceneStyle, garlandLights, baubleCount }) => {
  const uid = useUid();
  const skyId = `${uid}-sky`;
  const treeId = `${uid}-tree`;
  const trunkId = `${uid}-trunk`;
  const { center, celestial, trunk, star, groundShadow } = layout;
  const k = celestial.scale;
  const moonX = celestial.x + 40 * k;

  return (
    <svg
      className={styles.art}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--adv-scene-top)' }} />
          <stop offset="1" style={{ stopColor: 'var(--adv-scene-bottom)' }} />
        </linearGradient>
        <linearGradient id={treeId} x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0" style={{ stopColor: 'var(--adv-tree-light)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--adv-tree)' }} />
          <stop offset="1" style={{ stopColor: 'var(--adv-tree-dark)' }} />
        </linearGradient>
        <linearGradient id={trunkId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--adv-trunk)' }} />
          <stop offset="1" style={{ stopColor: 'var(--adv-trunk-dark)' }} />
        </linearGradient>
      </defs>

      {/* Ciel */}
      <rect x={view.x - 2} y={view.y - 2} width={view.w + 4} height={view.h + 4} fill={`url(#${skyId})`} />

      {sceneStyle === 'night' && (
        <g>
          {layout.skyStars.map((skyStar, index) => (
            <circle
              key={index}
              className={styles.skyStar}
              cx={skyStar.x}
              cy={skyStar.y}
              r={skyStar.r}
              style={{ ...fillOf('var(--adv-star-light)'), animationDelay: `${skyStar.delay}s` }}
            />
          ))}
          <path
            d={`M ${moonX} ${celestial.y - 60 * k} A ${70 * k} ${70 * k} 0 1 0 ${moonX} ${celestial.y + 60 * k} A ${90 * k} ${90 * k} 0 0 1 ${moonX} ${celestial.y - 60 * k} Z`}
            style={fillOf('var(--adv-star-light)')}
          />
        </g>
      )}
      {sceneStyle === 'day' && (
        <g>
          <circle cx={celestial.x} cy={celestial.y} r={96 * k} style={fillOf('var(--adv-star-light)')} />
          <circle cx={celestial.x} cy={celestial.y} r={58 * k} style={fillOf('var(--adv-star)')} />
        </g>
      )}
      {sceneStyle === 'snow' && (
        <g>
          {layout.pines.map((pine) => (
            <path key={pine.x} d={pinePath(pine.x, pine.h, pine.w, layout.pineBase)} style={fillOf('var(--adv-pine)')} />
          ))}
        </g>
      )}

      {/* Collines et sol enneigé */}
      <path d={layout.groundBackPath} style={fillOf('var(--adv-ground-back)')} />
      <path d={layout.groundPath} style={fillOf('var(--adv-ground)')} />
      <ellipse cx={center} cy={groundShadow.cy} rx={groundShadow.rx} ry={groundShadow.ry} style={fillOf('var(--adv-ground-back)')} />

      {/* Sapin : tronc puis étages, du plus grand (derrière) au plus petit (devant) */}
      <rect x={trunk.x} y={trunk.y} width={trunk.width} height={trunk.height} fill={`url(#${trunkId})`} />
      {layout.tiers.slice().reverse().map((tier) => (
        <g key={tier.top}>
          <path d={tierPath(tier, center, 8)} style={fillOf('var(--adv-tree-deep)')} />
          <path
            d={tierPath(tier, center)}
            fill={`url(#${treeId})`}
            strokeWidth={4}
            strokeLinejoin="round"
            style={{ stroke: 'var(--adv-tree-dark)' }}
          />
          {sceneStyle === 'snow' && <path d={tierSnowPath(tier, center)} style={fillOf('var(--adv-ground-front)')} />}
        </g>
      ))}

      {/* Guirlande : fil doré et lumières (ou perles) qui scintillent en décalé */}
      {layout.garlands.map((swag, row) => (
        <g key={row}>
          <path d={swag.path} fill="none" strokeWidth={4} strokeLinecap="round" style={{ stroke: 'var(--adv-star)' }} />
          {swag.lights.map((light, index) => (
            garlandLights ? (
              <circle
                key={index}
                className={styles.light}
                cx={light.x}
                cy={light.y}
                r={6}
                style={{ ...fillOf(baubleVar(index + row + 1, baubleCount, '-hi')), animationDelay: `${-((index * 7 + row * 3) % 10) / 4}s` }}
              />
            ) : (
              <circle key={index} cx={light.x} cy={light.y - 3} r={3.5} style={fillOf('var(--adv-star)')} />
            )
          ))}
        </g>
      ))}

      {/* Étoile du sommet */}
      <path
        d={starPath(star.x, star.y, star.outer, star.inner)}
        strokeWidth={4}
        strokeLinejoin="round"
        style={{ fill: 'var(--adv-star)', stroke: 'var(--adv-star-dark)' }}
      />
      <path d={starPath(star.x - 5, star.y - 6, star.outer * 0.42, star.inner * 0.42)} style={fillOf('var(--adv-star-light)')} />

      {/* Neige au premier plan et cadeaux au pied du sapin */}
      <path d={layout.groundFrontPath} style={fillOf('var(--adv-ground-front)')} />
      {layout.gifts.map((gift) => (
        <Gift key={gift.x} {...gift} count={baubleCount} />
      ))}
    </svg>
  );
};
