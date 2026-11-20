import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { countByState, IDoorModel } from './calendarModel';
import { Icon, IconName } from '../../theme/Icons';

export interface ICalendarLegendProps {
  doors: IDoorModel[];
}

interface ILegendItem {
  key: string;
  label: string;
  count: number;
  icon: IconName;
  /** Fond et texte de la pastille : variables du profil (boule, « succès », verrouillé). */
  background: string;
  color: string;
  /** Contour de la pastille (anneau doré pour « à découvrir », comme la boule qui pulse). */
  ring: string;
}

const s: Record<string, React.CSSProperties> = {
  bar: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', margin: 0, padding: 0, listStyle: 'none' },
  count: { fontWeight: 600 }
};

/**
 * Légende des états des cases, en badges (mêmes couleurs que les boules et les portes du profil), avec le nombre de cases par état.
 * L'information n'est jamais portée par la couleur seule : chaque badge a une icône et un libellé.
 */
export const CalendarLegend: React.FC<ICalendarLegendProps> = ({ doors }) => {
  const count = (state: IDoorModel['state']): number => countByState(doors, state);
  const items: ILegendItem[] = [
    { key: 'available', label: strings.LegendAvailable, count: count('available'), icon: 'gift', background: 'var(--adv-bauble-1)', color: 'var(--adv-on-bauble-1)', ring: 'var(--adv-star)' },
    { key: 'opened', label: strings.LegendViewed, count: count('opened'), icon: 'check', background: 'var(--ac-success)', color: 'var(--ac-white)', ring: 'var(--ac-success)' },
    { key: 'locked', label: strings.LegendLocked, count: count('locked'), icon: 'lock', background: 'var(--adv-locked)', color: 'var(--adv-on-locked)', ring: 'var(--adv-locked-lo)' }
  ];

  return (
    <ul style={s.bar} aria-label={strings.LegendLabel}>
      {items.map((item) => (
        <li key={item.key} className="ac-badge ac-badge-outline ac-badge-lg">
          <span
            className="ac-badge-dot-icon"
            style={{ background: item.background, color: item.color, boxShadow: `0 0 0 2px var(--ac-card), 0 0 0 3px ${item.ring}` }}
            aria-hidden="true"
          >
            <Icon name={item.icon} size={12} style={{ strokeWidth: 2.5 }} />
          </span>
          <span>
            {item.label} <span className="ac-tabular" style={s.count}>({item.count})</span>
          </span>
        </li>
      ))}
    </ul>
  );
};
