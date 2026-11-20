import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { IAdventServices } from '../../services/AdventServices';
import { IPublication, IPublicationInput } from '../../models/IPublication';
import { defaultUnlockDate, formatShortDate, parseIsoDay, toIsoDay } from '../../services/dateUtils';
import { format, getErrorMessage, isHttpUrl } from '../../services/format';
import { Modal } from '../common/Modal';
import { DateInput } from '../common/DateInput';
import { StatusMessage } from '../common/StatusMessage';
import { SegmentedControl } from '../common/SegmentedControl';
import { Icon } from '../../theme/Icons';
import { RichTextEditor } from './RichTextEditor';
import { ImageField } from './ImageField';
import { FormField } from './FormField';
import { useFieldId } from '../../hooks/useFieldId';
import { a } from '../common/layoutStyles';

export interface IPublicationFormModalProps {
  services: IAdventServices;
  year: number;
  publication: IPublication | undefined;
  initialDay: number;
  usedDays: Set<number>;
  onSave: (input: IPublicationInput, id: number | undefined) => Promise<void>;
  onCancel: () => void;
}

type PublishedValue = 'draft' | 'published';

interface IFormErrors {
  title?: string;
  imageUrl?: string;
  linkUrl?: string;
}

/** Création / modification d'une publication (pop-up centrée). */
export const PublicationFormModal: React.FC<IPublicationFormModalProps> = (props) => {
  const { services, year, publication, initialDay, usedDays, onSave, onCancel } = props;

  const [draft, setDraft] = React.useState<IPublicationInput>(() => publication
    ? { ...publication }
    : {
      title: '',
      day: initialDay,
      year,
      unlockDate: undefined,
      imageUrl: undefined,
      body: '',
      linkUrl: undefined,
      linkText: undefined,
      published: false
    });
  const [errors, setErrors] = React.useState<IFormErrors>({});
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [saveError, setSaveError] = React.useState<string | undefined>(undefined);
  const ids = {
    day: useFieldId('adv-day'),
    unlock: useFieldId('adv-unlock'),
    title: useFieldId('adv-title'),
    linkUrl: useFieldId('adv-link'),
    linkText: useFieldId('adv-link-text')
  };

  const update = <K extends keyof IPublicationInput>(key: K, value: IPublicationInput[K]): void => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const validate = (): boolean => {
    const next: IFormErrors = {};
    if (!draft.title.trim()) {
      next.title = strings.ErrorRequired;
    }
    if (draft.imageUrl && !isHttpUrl(draft.imageUrl)) {
      next.imageUrl = strings.ErrorInvalidUrl;
    }
    if (draft.linkUrl && !isHttpUrl(draft.linkUrl)) {
      next.linkUrl = strings.ErrorInvalidUrl;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) {
      return;
    }
    setIsSaving(true);
    setSaveError(undefined);
    try {
      await onSave({ ...draft, year }, publication?.id);
    } catch (error) {
      setSaveError(getErrorMessage(error));
      setIsSaving(false);
    }
  };

  const defaultDate = defaultUnlockDate(year, draft.day);

  return (
    <Modal
      open
      onClose={onCancel}
      title={publication ? format(strings.EditPublicationTitle, publication.day) : strings.NewPublication}
      subtitle={format(strings.EditionLabel, year)}
      width="760px"
      closeDisabled={isSaving}
      footer={
        <div style={a.footer}>
          <button type="button" className="ac-btn ac-btn-outline" onClick={onCancel} disabled={isSaving}>
            {strings.Cancel}
          </button>
          <button
            type="button"
            className="ac-btn ac-btn-primary"
            onClick={() => { handleSubmit().catch(() => undefined); }}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            <Icon name="save" size={16} />
            {isSaving ? strings.Saving : strings.Save}
          </button>
        </div>
      }
    >
      <div style={a.stack}>
        {saveError && <StatusMessage tone="error" message={saveError} onDismiss={() => setSaveError(undefined)} />}

        <div className="ac-form-row">
          <FormField label={strings.FieldDay} htmlFor={ids.day} required>
            <select
              id={ids.day}
              className="ac-select"
              value={draft.day}
              onChange={(event) => update('day', Number(event.target.value))}
            >
              {Array.from({ length: 24 }, (_, index) => index + 1).map((day) => {
                const isTaken = usedDays.has(day) && day !== publication?.day;
                return (
                  <option key={day} value={day} disabled={isTaken}>
                    {format(isTaken ? strings.DayOptionTaken : strings.DayOption, day)}
                  </option>
                );
              })}
            </select>
          </FormField>
          <FormField
            label={strings.FieldUnlockDate}
            htmlFor={ids.unlock}
            help={draft.unlockDate ? undefined : format(strings.UnlockDatePlaceholder, formatShortDate(defaultDate))}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <DateInput
                  id={ids.unlock}
                  value={toIsoDay(draft.unlockDate)}
                  onChange={(iso) => update('unlockDate', parseIsoDay(iso))}
                />
              </div>
              {draft.unlockDate && (
                <button
                  type="button"
                  className="ac-icon-btn"
                  title={format(strings.ResetUnlockDate, formatShortDate(defaultDate))}
                  aria-label={format(strings.ResetUnlockDate, formatShortDate(defaultDate))}
                  onClick={() => update('unlockDate', undefined)}
                >
                  <Icon name="reset" size={16} />
                </button>
              )}
            </div>
          </FormField>
        </div>

        <FormField label={strings.FieldTitle} htmlFor={ids.title} required error={errors.title}>
          <input
            id={ids.title}
            className="ac-input"
            value={draft.title}
            maxLength={255}
            onChange={(event) => update('title', event.target.value)}
          />
        </FormField>

        <ImageField
          services={services}
          label={strings.FieldImage}
          value={draft.imageUrl}
          error={errors.imageUrl}
          onChange={(value) => update('imageUrl', value)}
        />

        <FormField label={strings.FieldBody}>
          <RichTextEditor value={draft.body} ariaLabel={strings.FieldBody} onChange={(value) => update('body', value)} />
        </FormField>

        <div className="ac-form-row">
          <FormField label={strings.FieldLinkUrl} htmlFor={ids.linkUrl} error={errors.linkUrl}>
            <input
              id={ids.linkUrl}
              className="ac-input"
              type="url"
              placeholder="https://"
              value={draft.linkUrl ?? ''}
              onChange={(event) => update('linkUrl', event.target.value.trim() || undefined)}
            />
          </FormField>
          <FormField label={strings.FieldLinkText} htmlFor={ids.linkText}>
            <input
              id={ids.linkText}
              className="ac-input"
              placeholder={strings.PublicationReadMore}
              value={draft.linkText ?? ''}
              onChange={(event) => update('linkText', event.target.value || undefined)}
            />
          </FormField>
        </div>

        <FormField label={strings.FieldPublished}>
          <div style={{ alignSelf: 'flex-start' }}>
            <SegmentedControl<PublishedValue>
              ariaLabel={strings.FieldPublished}
              value={draft.published ? 'published' : 'draft'}
              onChange={(value) => update('published', value === 'published')}
              options={[
                { value: 'draft', label: strings.StatusDraft },
                { value: 'published', label: strings.StatusPublished }
              ]}
            />
          </div>
        </FormField>
      </div>
    </Modal>
  );
};
