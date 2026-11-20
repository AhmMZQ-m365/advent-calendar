import * as React from "react";
import * as strings from "AdventCalendarWebPartStrings";
import { Icon } from "../../theme/Icons";
import { pushOverlay, popOverlay, isTopOverlay } from "./overlayStack";
import { getTabStops } from "./focus";
import { useFieldId } from "../../hooks/useFieldId";

/** Où placer le focus à l'ouverture : premier champ du contenu (défaut), premier bouton du pied (confirmations), ou le panneau lui-même. */
export type ModalInitialFocus = "content" | "footer" | "panel";

export interface IModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Description affichée sous le titre (ex. « Édition 2026 », message d'une confirmation). */
  subtitle?: string;
  /** Largeur maximale du panneau (le panneau reste responsive : min(width, 95vw)) */
  width?: string;
  /** Empêche la fermeture (overlay + croix + Échap) — ex: pendant une sauvegarde */
  closeDisabled?: boolean;
  /** Actions alignées par l'appelant (en général à droite : annuler puis action principale). */
  footer?: React.ReactNode;
  initialFocus?: ModalInitialFocus;
  /** Contenu ; absent pour une simple confirmation (titre, description, pied). */
  children?: React.ReactNode;
}

/**
 * Boîte de dialogue centrée (façon Dialog shadcn) en HTML/CSS pur : overlay sombre légèrement flouté, panneau arrondi,
 * en-tête (titre + description), contenu défilant, pied d'actions. Entrée animée (fondu + zoom 0,96 → 1).
 * Rendue directement dans le DOM de la web part (position: fixed) — aucun portail
 * vers document.body, donc aucun conflit avec le shell React/Tabster de SharePoint.
 * Clavier : Échap ferme la boîte du dessus ; Tab reste dans la boîte du dessus ; le focus revient à l'élément d'origine.
 */
export const Modal: React.FC<IModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  width = "640px",
  closeDisabled,
  footer,
  initialFocus = "content",
  children,
}) => {
  const baseId = useFieldId("ac-modal");
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;
  const panelRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const footerRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const closeDisabledRef = React.useRef(closeDisabled);
  closeDisabledRef.current = closeDisabled;

  React.useEffect(() => {
    if (!open) return;
    const id = baseId;
    pushOverlay(id);

    // Focus à l'ouverture, restitué à la fermeture.
    const active = document.activeElement;
    const previous = active instanceof HTMLElement ? active : undefined;
    const panel = panelRef.current;
    const zones = initialFocus === "footer"
      ? [footerRef.current, bodyRef.current]
      : initialFocus === "content" ? [bodyRef.current, footerRef.current] : [];
    let target: HTMLElement | undefined;
    for (const zone of zones) {
      if (!target && zone) target = getTabStops(zone)[0];
    }
    (target ?? panel)?.focus();

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && isTopOverlay(id) && !closeDisabledRef.current) {
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      popOverlay(id);
      window.removeEventListener("keydown", onKeyDown);
      if (previous && document.body.contains(previous)) previous.focus();
    };
  }, [open]);

  const requestClose = (): void => {
    if (!closeDisabled) onClose();
  };

  // Piège de focus : Tab / Maj+Tab bouclent dans le panneau de la boîte du dessus.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "Tab" || !panelRef.current || !isTopOverlay(baseId)) return;
    const stops = getTabStops(panelRef.current);
    if (stops.length === 0) {
      event.preventDefault();
      return;
    }
    const first = stops[0];
    const last = stops[stops.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const hasBody = children !== undefined && children !== null && children !== false;

  return (
    <>
      <div
        className={`ac-overlay${open ? " ac-overlay--open" : ""}`}
        style={{
          pointerEvents: open ? "auto" : "none",
          visibility: open ? "visible" : "hidden",
        }}
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        className="ac-modal-wrap"
        style={{ visibility: open ? "visible" : "hidden" }}
      >
        <div
          ref={panelRef}
          className={`ac-modal${open ? " ac-modal--open" : ""}`}
          style={{ maxWidth: width }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={subtitle ? descId : undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <div className="ac-dialog-header">
            <div className="ac-dialog-heading">
              <h2 id={titleId} className="ac-dialog-title">{title}</h2>
              {subtitle && <p id={descId} className="ac-dialog-desc">{subtitle}</p>}
            </div>
            <button
              type="button"
              className="ac-icon-btn"
              onClick={requestClose}
              disabled={closeDisabled}
              aria-label={strings.Close}
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {hasBody && (
            <div ref={bodyRef} className="ac-dialog-body ac-scroll">
              {children}
            </div>
          )}

          {footer && <div ref={footerRef} className="ac-dialog-footer">{footer}</div>}
        </div>
      </div>
    </>
  );
};
