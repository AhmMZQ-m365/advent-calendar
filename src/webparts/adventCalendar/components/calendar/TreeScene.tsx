import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import styles from './TreeScene.module.scss';
import { countByState, DoorState, IDoorModel } from './calendarModel';
import { useDoorOpening } from './useDoorOpening';
import { SnowEffect } from './SnowEffect';
import { TreeArt } from './TreeArt';
import { IThemeProfile } from '../../models/IThemeProfile';
import {
  BAUBLE_ASPECT,
  fullView,
  getTreeFormat,
  ISceneView,
  ITreeLayout,
  SCENE_COMPACT,
  TREE_LAYOUTS,
  TreeFormat
} from '../../defaults/tree/treeLayout';
import { useElementWidth } from '../../hooks/useElementWidth';
import { normalizeBaublePalette } from '../../services/ThemeService';
import { format } from '../../services/format';
import { Icon } from '../../theme/Icons';

export interface ITreeSceneProps {
  doors: IDoorModel[];
  year: number;
  /** Profil de thème : feuillage, palette des boules, décor, guirlande, neige et logo. */
  theme: IThemeProfile;
  onOpen?: (door: IDoorModel) => void;
  /** Aperçu (administration) : sapin seul, boules non interactives, sans texte. Les variables --adv-* doivent venir d'un ancêtre. */
  isPreview?: boolean;
}

interface IBaubleProps {
  door: IDoorModel;
  /** Rang de la boule dans l'ordre de lecture du sapin (0 à 23). */
  index: number;
  /** Géométrie du format affiché (positions et diamètre des boules). */
  layout: ITreeLayout;
  view: ISceneView;
  /** Nombre de couleurs de la palette. */
  count: number;
  onOpen?: (door: IDoorModel) => void;
}

const STATE_CLASS_NAMES: Record<DoorState, string> = {
  locked: styles.baubleLocked,
  available: styles.baubleAvailable,
  opened: styles.baubleOpened,
  empty: styles.baubleEmpty
};

/** Position et largeur d'une boule en % de la zone affichée (le crochet dépasse au-dessus du centre). */
function hostStyle(layout: ITreeLayout, view: ISceneView, index: number): React.CSSProperties {
  const place = layout.baubles[index];
  const diameter = layout.baubleDiameter;
  const hook = diameter * (BAUBLE_ASPECT - 1);
  return {
    left: `${((place.x - diameter / 2 - view.x) / view.w) * 100}%`,
    top: `${((place.y - diameter / 2 - hook - view.y) / view.h) * 100}%`,
    width: `${(diameter / view.w) * 100}%`
  };
}

/** Classe CSS du format (mise en page du bloc d'information et tailles des pastilles). */
const FORMAT_CLASS_NAMES: Record<TreeFormat, string> = {
  wide: styles.formatWide,
  medium: styles.formatMedium,
  narrow: styles.formatNarrow
};

/** Couleurs de la boule : palette du profil en rotation ; grise (couleurs « verrouillé ») sans publication ou avant la date. */
function colorVars(state: DoorState, index: number, count: number): React.CSSProperties {
  if (state === 'locked' || state === 'empty') {
    const locked: Record<string, string> = {
      '--b': 'var(--adv-locked)',
      '--b-hi': 'var(--adv-locked-hi)',
      '--b-lo': 'var(--adv-locked-lo)',
      '--b-on': 'var(--adv-on-locked)'
    };
    return locked as React.CSSProperties;
  }
  const n = (index % count) + 1;
  const active: Record<string, string> = {
    '--b': `var(--adv-bauble-${n})`,
    '--b-hi': `var(--adv-bauble-${n}-hi)`,
    '--b-lo': `var(--adv-bauble-${n}-lo)`,
    '--b-on': `var(--adv-on-bauble-${n})`
  };
  return active as React.CSSProperties;
}

/** Boule du sapin : bouton natif (clavier, lecteur d'écran), rendu distinct par état. */
const TreeBauble: React.FC<IBaubleProps> = ({ door, index, layout, view, count, onOpen }) => {
  const { isInteractive, isOpening, handleClick, ariaLabel, tooltip } = useDoorOpening(door, false, onOpen);
  const className = [styles.bauble, STATE_CLASS_NAMES[door.state], isOpening ? styles.baubleOpening : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div role="listitem" className={styles.baubleHost} style={{ ...hostStyle(layout, view, index), ...colorVars(door.state, index, count) }}>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-disabled={!isInteractive}
        title={tooltip}
      >
        {door.state === 'available' && (
          <span className={styles.halo} style={{ animationDelay: `${-((index * 37) % 34) / 10}s` }} aria-hidden="true" />
        )}
        <span className={styles.cap} aria-hidden="true" />
        <span className={styles.ball} aria-hidden="true">
          <span className={styles.number}>{door.day}</span>
        </span>
        {isOpening && <span className={styles.burst} aria-hidden="true" />}
        {door.state === 'locked' && (
          <span className={`${styles.badge} ${styles.badgeLocked}`} aria-hidden="true"><Icon name="lock" size={12} /></span>
        )}
        {door.state === 'opened' && (
          <span className={`${styles.badge} ${styles.badgeViewed}`} aria-hidden="true">
            <Icon name="check" size={14} style={{ strokeWidth: 3 }} />
          </span>
        )}
      </button>
    </div>
  );
};

/** Boule d'un aperçu : même dessin, sans bouton. */
const TreeBaublePreview: React.FC<IBaubleProps> = ({ door, index, layout, view, count }) => (
  <div className={styles.baubleHost} style={{ ...hostStyle(layout, view, index), ...colorVars(door.state, index, count) }}>
    <span className={`${styles.bauble} ${STATE_CLASS_NAMES[door.state]}`}>
      <span className={styles.cap} />
      <span className={styles.ball}>
        <span className={styles.number}>{door.day}</span>
      </span>
    </span>
  </div>
);

/**
 * Présentation « Sapin », affichée à toutes les largeurs. Le format (paysage 16:9, moyen 5:4, portrait) est choisi selon la
 * largeur MESURÉE de la scène (le web part peut être dans une colonne étroite) : chaque format a son dessin SVG et ses
 * positions de boules (defaults/tree/treeLayout.ts) ; le bloc d'information (titre, année, vœux, progression, logo) est
 * à gauche en paysage, au-dessus du sapin sinon. Entièrement piloté par les variables --adv-* du profil.
 * En mode aperçu, seul le sapin (format paysage, zone resserrée) est affiché et rien n'est interactif.
 */
export const TreeScene: React.FC<ITreeSceneProps> = ({ doors, year, theme, onOpen, isPreview }) => {
  const [sceneRef, width] = useElementWidth<HTMLDivElement>();
  const treeFormat: TreeFormat = isPreview ? 'wide' : getTreeFormat(width);
  const layout = TREE_LAYOUTS[treeFormat];
  const view = isPreview ? SCENE_COMPACT : fullView(layout);
  const count = normalizeBaublePalette(theme.tree.baubleColors).length;
  const openedCount = countByState(doors, 'opened');

  return (
    <div
      ref={sceneRef}
      className={`${styles.scene} ${FORMAT_CLASS_NAMES[treeFormat]} ${isPreview ? styles.sceneCompact : ''}`}
      aria-hidden={isPreview ? true : undefined}
    >
      {!isPreview && (
        <div className={styles.info}>
          {theme.logoUrl && (
            <span className={styles.logoPlate}><img className={styles.logo} src={theme.logoUrl} alt="" /></span>
          )}
          <div className={styles.infoText}>
            <p className={styles.title}>{strings.TreeTitle}</p>
            <p className={styles.year}>{year}</p>
            <p className={styles.tagline}>
              {strings.TreeTagline}
              <br />
              {strings.TreeWishes}
            </p>
          </div>
          <div className={styles.progress}>
            <span className={styles.progressTrack} aria-hidden="true">
              <span className={styles.progressFill} style={{ width: `${(openedCount / Math.max(1, doors.length)) * 100}%` }} />
            </span>
            <span className={styles.progressLabel}>{format(strings.TreeProgress, openedCount, doors.length)}</span>
          </div>
        </div>
      )}

      <div className={styles.stage} style={{ aspectRatio: `${view.w} / ${view.h}` }}>
        <TreeArt layout={layout} view={view} sceneStyle={theme.tree.sceneStyle} garlandLights={theme.tree.garlandLights} baubleCount={count} />

        <div className={styles.baubles} role={isPreview ? undefined : 'list'} aria-label={isPreview ? undefined : strings.GridAriaLabel}>
          {doors.map((door, index) => (isPreview ? (
            <TreeBaublePreview key={door.day} door={door} index={index} layout={layout} view={view} count={count} />
          ) : (
            <TreeBauble key={door.day} door={door} index={index} layout={layout} view={view} count={count} onOpen={onOpen} />
          )))}
        </div>
      </div>

      {theme.snowEffect && (
        <div className={styles.snowLayer} style={{ '--adv-snow': 'var(--adv-scene-snow)' } as React.CSSProperties}>
          <SnowEffect />
        </div>
      )}
    </div>
  );
};
