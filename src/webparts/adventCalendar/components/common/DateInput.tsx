import * as React from "react";
import * as strings from "AdventCalendarWebPartStrings";
import { Icon } from "../../theme/Icons";
import { DatePartOrder, getDatePartOrder } from "../../services/dateUtils";
import { format } from "../../services/format";

export interface IDateInputProps {
  /** Identifiant posé sur l'input texte visible (pour `<label htmlFor>`). */
  id?: string;
  /** Valeur au format ISO YYYY-MM-DD (comme un <input type="date">), "" si vide */
  value: string;
  /** Renvoie la nouvelle valeur ISO YYYY-MM-DD, ou "" si champ vidé */
  onChange: (isoValue: string) => void;
  /** Par défaut : gabarit de la langue courante (« jj/mm/aaaa », « mm/dd/yyyy »…) */
  placeholder?: string;
  disabled?: boolean;
  /** Style additionnel appliqué à l'input texte */
  inputStyle?: React.CSSProperties;
}

/**
 * Élément input date natif avec la méthode showPicker (Chrome/Edge 99+).
 * La lib DOM de TS 5.8 déclare déjà `showPicker()` sur HTMLInputElement ; la
 * vérification à l'exécution reste en place pour les anciens navigateurs.
 */
type IDateInputElement = HTMLInputElement;

const s: Record<string, React.CSSProperties> = {
  hiddenNative: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: "1px",
    height: "1px",
    opacity: 0,
    pointerEvents: "none",
    border: 0,
    padding: 0,
  },
};

type DatePart = "d" | "m" | "y";

/** Parties de la date dans l'ordre d'affichage, avec leur nombre de chiffres. */
const PARTS: Record<DatePartOrder, Array<{ key: DatePart; length: number }>> = {
  dmy: [{ key: "d", length: 2 }, { key: "m", length: 2 }, { key: "y", length: 4 }],
  mdy: [{ key: "m", length: 2 }, { key: "d", length: 2 }, { key: "y", length: 4 }],
  ymd: [{ key: "y", length: 4 }, { key: "m", length: 2 }, { key: "d", length: 2 }],
};

/** ISO YYYY-MM-DD → texte affiché dans l'ordre de la langue (jj/mm/aaaa, mm/dd/yyyy…) */
function isoToDisplay(iso: string, order: DatePartOrder): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const values: Record<DatePart, string> = { y: m[1], m: m[2], d: m[3] };
  return PARTS[order].map((part) => values[part.key]).join("/");
}

/** Texte complet et plausible dans l'ordre de la langue → ISO YYYY-MM-DD, sinon undefined */
function displayToIso(text: string, order: DatePartOrder): string | undefined {
  const pieces = text.split("/");
  const parts = PARTS[order];
  if (pieces.length !== 3 || pieces.some((piece, i) => !/^\d+$/.test(piece) || piece.length !== parts[i].length)) {
    return undefined;
  }
  const values: Record<DatePart, string> = { d: "", m: "", y: "" };
  parts.forEach((part, i) => {
    values[part.key] = pieces[i];
  });
  const day = Number(values.d);
  const month = Number(values.m);
  const year = Number(values.y);
  if (month < 1 || month > 12) return undefined;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return undefined;
  return `${values.y}-${values.m}-${values.d}`;
}

/** Masque de saisie : ne garde que les chiffres et insère les / selon l'ordre de la langue */
function applyMask(raw: string, order: DatePartOrder): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const [first, second] = PARTS[order].map((part) => part.length);
  if (digits.length <= first) return digits;
  if (digits.length <= first + second) return `${digits.slice(0, first)}/${digits.slice(first)}`;
  return `${digits.slice(0, first)}/${digits.slice(first, first + second)}/${digits.slice(first + second)}`;
}

/** Gabarit lisible (« jj/mm/aaaa », « mm/dd/yyyy »…) à partir des libellés de la langue courante. */
function datePattern(order: DatePartOrder): string {
  const tokens: Record<DatePart, string> = {
    d: strings.DateTokenDay,
    m: strings.DateTokenMonth,
    y: strings.DateTokenYear,
  };
  return PARTS[order].map((part) => tokens[part.key]).join("/");
}

/**
 * Champ date avec rendu FORCÉ dans l'ordre de la langue de l'interface
 * (jj/mm/aaaa en français, mm/dd/yyyy en anglais américain…), quelle que soit
 * la langue du navigateur (un <input type="date"> natif s'affiche dans la
 * locale du navigateur, sans moyen de l'imposer en CSS).
 * Saisie au clavier masquée + bouton calendrier qui ouvre le sélecteur natif
 * (input date caché + showPicker()).
 * API identique à un <input type="date"> : value/onChange en ISO YYYY-MM-DD.
 */
export const DateInput: React.FC<IDateInputProps> = ({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  inputStyle,
}) => {
  const order = React.useMemo<DatePartOrder>(getDatePartOrder, []);
  const pattern = datePattern(order);
  const nativeRef = React.useRef<IDateInputElement>(null);
  const [text, setText] = React.useState<string>(isoToDisplay(value, order));

  // Synchronise l'affichage quand la valeur change depuis l'extérieur
  // (préréglages de période, réinitialisation, préremplissage du formulaire…)
  React.useEffect(() => {
    setText(isoToDisplay(value, order));
  }, [value, order]);

  const handleTextChange = (raw: string): void => {
    const masked = applyMask(raw, order);
    setText(masked);
    if (masked === "") {
      onChange("");
      return;
    }
    const iso = displayToIso(masked, order);
    if (iso) onChange(iso);
  };

  const handleBlur = (): void => {
    // Saisie incomplète/invalide à la sortie du champ → on revient à la
    // dernière valeur valide connue
    if (text !== "" && displayToIso(text, order) === undefined) {
      setText(isoToDisplay(value, order));
    }
  };

  const openPicker = (): void => {
    const el = nativeRef.current;
    if (!el || disabled) return;
    try {
      if (el.showPicker) el.showPicker();
      else el.focus();
    } catch {
      el.focus();
    }
  };

  return (
    <div className="ac-input-wrap">
      <input
        id={id}
        className="ac-input"
        style={{ paddingRight: "40px", ...inputStyle }}
        type="text"
        inputMode="numeric"
        placeholder={placeholder ?? pattern}
        value={text}
        disabled={disabled}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        aria-label={format(strings.DateInputAriaLabel, pattern)}
      />
      <button
        type="button"
        className="ac-icon-btn ac-icon-btn-sm ac-input-addon"
        onClick={openPicker}
        disabled={disabled}
        tabIndex={-1}
        aria-label={strings.OpenDatePicker}
        title={strings.OpenDatePicker}
      >
        <Icon name="calendar" size={16} />
      </button>
      {/* Input date natif caché : sert uniquement de sélecteur calendrier */}
      <input
        ref={nativeRef}
        type="date"
        style={s.hiddenNative}
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </div>
  );
};
