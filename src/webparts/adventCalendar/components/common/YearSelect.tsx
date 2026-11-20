import * as React from "react";
import * as strings from "AdventCalendarWebPartStrings";
import { Icon } from "../../theme/Icons";

export interface IYearSelectProps {
  years: number[];
  value: number | undefined;
  onChange: (year: number) => void;
  /** Nombre d'éléments par année, affiché entre parenthèses. */
  counts?: Record<number, number>;
  title?: string;
}

/**
 * Sélecteur d'année « Année 2027 (12) » : liste déroulante native habillée
 * en pastille (styles `.ac-year*`, theme/globalStyles.ts).
 */
export const YearSelect: React.FC<IYearSelectProps> = ({ years, value, onChange, counts, title }) => (
  <label className="ac-year" title={title}>
    <Icon name="calendar" size={16} />
    <span className="ac-year-label">{strings.YearLabel}</span>
    <select
      className="ac-year-select"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={strings.YearLabel}
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {counts && counts[y] !== undefined ? `${y} (${counts[y]})` : String(y)}
        </option>
      ))}
    </select>
    <Icon name="chevron-down" size={16} className="ac-year-chevron" />
  </label>
);
