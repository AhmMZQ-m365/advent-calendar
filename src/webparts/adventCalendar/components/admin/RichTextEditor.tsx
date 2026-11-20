import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { sanitizeHtml } from '../../services/htmlSanitizer';
import { isHttpUrl } from '../../services/format';
import { Icon, IconName } from '../../theme/Icons';
import { Modal } from '../common/Modal';
import { FormField } from './FormField';
import { useFieldId } from '../../hooks/useFieldId';
import { a } from '../common/layoutStyles';

export interface IRichTextEditorProps {
  value: string;
  ariaLabel: string;
  onChange: (html: string) => void;
}

type FormatCommand = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList' | 'removeFormat' | 'unlink';
type ToggleCommand = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList';

interface IToolbarAction {
  command: FormatCommand | 'link';
  icon: IconName;
  label: string;
  /** Bascule : l'état de la sélection est reflété par `aria-pressed`. */
  toggle?: boolean;
}

/** Groupes séparés par un filet : style du texte, listes, liens, nettoyage. */
const TOOLBAR_GROUPS: IToolbarAction[][] = [
  [
    { command: 'bold', icon: 'bold', label: strings.EditorBold, toggle: true },
    { command: 'italic', icon: 'italic', label: strings.EditorItalic, toggle: true },
    { command: 'underline', icon: 'underline', label: strings.EditorUnderline, toggle: true }
  ],
  [
    { command: 'insertUnorderedList', icon: 'list', label: strings.EditorBulletList, toggle: true },
    { command: 'insertOrderedList', icon: 'list-ordered', label: strings.EditorNumberedList, toggle: true }
  ],
  [
    { command: 'link', icon: 'link', label: strings.EditorLink },
    { command: 'unlink', icon: 'unlink', label: strings.EditorUnlink }
  ],
  [{ command: 'removeFormat', icon: 'eraser', label: strings.EditorClearFormat }]
];

const TOGGLES: ToggleCommand[] = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];

type ActiveState = Partial<Record<ToggleCommand, boolean>>;

/**
 * Exécute une commande d'édition sur la sélection courante.
 * `document.execCommand` est marqué obsolète mais reste la seule API native, prise en charge par
 * tous les navigateurs, pour mettre en forme un contenu `contenteditable` sans dépendance externe.
 */
function runCommand(command: FormatCommand | 'createLink', argument?: string): void {
  document.execCommand(command, false, argument);
}

/**
 * Éditeur de texte enrichi minimal (gras, italique, souligné, listes, liens), en HTML natif.
 * Barre d'outils façon groupe de boutons à bascule (shadcn) ; le contenu est rendu avec la même typographie que la pop-up
 * de publication (`.ac-prose`). Il est assaini au chargement, puis à l'enregistrement et à l'affichage.
 */
export const RichTextEditor: React.FC<IRichTextEditorProps> = ({ value, ariaLabel, onChange }) => {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const savedRange = React.useRef<Range | undefined>(undefined);
  const [isLinkOpen, setIsLinkOpen] = React.useState<boolean>(false);
  const [linkUrl, setLinkUrl] = React.useState<string>('https://');
  const [active, setActive] = React.useState<ActiveState>({});
  const linkId = useFieldId('adv-link-url');

  // Composant non contrôlé : le HTML initial est injecté une seule fois pour préserver la position du curseur.
  React.useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = sanitizeHtml(value);
    }
  }, []);

  // État des boutons à bascule : suit la sélection tant qu'elle est dans l'éditeur.
  React.useEffect(() => {
    const refresh = (): void => {
      const selection = window.getSelection();
      if (!selection || !selection.anchorNode || !editorRef.current?.contains(selection.anchorNode)) {
        return;
      }
      const next: ActiveState = {};
      TOGGLES.forEach((command) => {
        try {
          next[command] = document.queryCommandState(command);
        } catch {
          next[command] = false;
        }
      });
      setActive((current) => (TOGGLES.every((command) => !!current[command] === !!next[command]) ? current : next));
    };
    document.addEventListener('selectionchange', refresh);
    return () => document.removeEventListener('selectionchange', refresh);
  }, []);

  const emitChange = (): void => {
    onChange(editorRef.current?.innerHTML ?? '');
  };

  const openLink = (): void => {
    const selection = window.getSelection();
    savedRange.current = selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)
      ? selection.getRangeAt(0).cloneRange()
      : undefined;
    setLinkUrl('https://');
    setIsLinkOpen(true);
  };

  const apply = (action: IToolbarAction): void => {
    if (action.command === 'link') {
      openLink();
      return;
    }
    editorRef.current?.focus();
    runCommand(action.command);
    emitChange();
  };

  const insertLink = (): void => {
    setIsLinkOpen(false);
    if (!isHttpUrl(linkUrl) || !editorRef.current) {
      return;
    }
    editorRef.current.focus();
    const selection = window.getSelection();
    if (savedRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    if (selection && !selection.isCollapsed) {
      runCommand('createLink', linkUrl);
    } else {
      const anchor = document.createElement('a');
      anchor.href = linkUrl;
      anchor.textContent = linkUrl;
      const range = savedRange.current ?? document.createRange();
      if (!savedRange.current) {
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }
      range.insertNode(anchor);
    }
    emitChange();
  };

  return (
    <div className="ac-editor">
      <div className="ac-editor-toolbar" role="toolbar" aria-label={strings.EditorToolbar}>
        {TOOLBAR_GROUPS.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {groupIndex > 0 && <hr className="ac-separator ac-separator-v" />}
            {group.map((action) => (
              <button
                key={action.command}
                type="button"
                className="ac-icon-btn ac-icon-btn-sm"
                title={action.label}
                aria-label={action.label}
                aria-pressed={action.toggle ? !!active[action.command as ToggleCommand] : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => apply(action)}
              >
                <Icon name={action.icon} size={16} />
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div
        ref={editorRef}
        className="ac-editor-content ac-prose ac-scroll"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        onInput={emitChange}
        onBlur={emitChange}
      />

      <Modal
        open={isLinkOpen}
        onClose={() => setIsLinkOpen(false)}
        title={strings.EditorLinkDialogTitle}
        width="480px"
        footer={
          <div style={a.footer}>
            <button type="button" className="ac-btn ac-btn-outline" onClick={() => setIsLinkOpen(false)}>
              {strings.Cancel}
            </button>
            <button type="button" className="ac-btn ac-btn-primary" disabled={!isHttpUrl(linkUrl)} onClick={insertLink}>
              {strings.Insert}
            </button>
          </div>
        }
      >
        <FormField
          label={strings.EditorLinkUrl}
          htmlFor={linkId}
          error={linkUrl && !isHttpUrl(linkUrl) ? strings.ErrorInvalidUrl : undefined}
        >
          <input
            id={linkId}
            className="ac-input"
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
          />
        </FormField>
      </Modal>
    </div>
  );
};
