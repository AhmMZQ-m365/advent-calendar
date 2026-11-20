import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { Modal } from './Modal';
import { a } from './layoutStyles';

export interface IConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Action destructive : bouton « destructive ». */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation d'une action (façon AlertDialog shadcn) : titre, message, « Annuler » (focus initial) et action. */
export const ConfirmModal: React.FC<IConfirmModalProps> = (props) => {
  const { open, title, message, confirmLabel, danger, busy, onConfirm, onCancel } = props;
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      subtitle={message}
      width="440px"
      closeDisabled={busy}
      initialFocus="footer"
      footer={
        <div style={a.footer}>
          <button type="button" className="ac-btn ac-btn-outline" onClick={onCancel} disabled={busy}>
            {strings.Cancel}
          </button>
          <button
            type="button"
            className={`ac-btn ${danger ? 'ac-btn-destructive' : 'ac-btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
          >
            {confirmLabel}
          </button>
        </div>
      }
    />
  );
};
