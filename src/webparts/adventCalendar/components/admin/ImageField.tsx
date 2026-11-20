import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { IAdventServices } from '../../services/AdventServices';
import { getErrorMessage, isHttpUrl } from '../../services/format';
import { Icon } from '../../theme/Icons';
import { Loader } from '../common/Loader';
import { FormField } from './FormField';
import { useFieldId } from '../../hooks/useFieldId';

export interface IImageFieldProps {
  services: IAdventServices;
  label: string;
  value: string | undefined;
  error?: string;
  onChange: (value: string | undefined) => void;
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' };

/** URL d'image saisie à la main ou téléversée dans Ressources du site / AdventCalendar, avec aperçu. */
export const ImageField: React.FC<IImageFieldProps> = ({ services, label, value, error, onChange }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState<boolean>(false);
  const [uploadError, setUploadError] = React.useState<string | undefined>(undefined);
  const inputId = useFieldId('adv-image');
  const messageId = useFieldId('adv-image-msg');
  const fieldError = error ?? uploadError;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    setUploadError(undefined);
    const validationError = services.assets.validateImage(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setIsUploading(true);
    try {
      onChange(await services.assets.uploadImage(file));
    } catch (uploadFailure) {
      setUploadError(getErrorMessage(uploadFailure));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <FormField label={label} htmlFor={inputId} error={fieldError} messageId={messageId}>
      <div style={rowStyle}>
        <input
          id={inputId}
          className="ac-input"
          style={{ flex: '1 1 260px', width: 'auto' }}
          type="url"
          placeholder="https://"
          value={value ?? ''}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? messageId : undefined}
          onChange={(event) => onChange(event.target.value.trim() || undefined)}
        />
        <button
          type="button"
          className="ac-btn ac-btn-outline"
          disabled={isUploading}
          aria-busy={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="upload" size={16} />
          {strings.UploadImage}
        </button>
        {value && (
          <button type="button" className="ac-btn ac-btn-ghost" onClick={() => onChange(undefined)}>
            <Icon name="close" size={16} />
            {strings.RemoveImage}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => { handleFile(event).catch(() => undefined); }}
        />
      </div>
      {isUploading && <Loader label={strings.Uploading} inline />}
      {value && isHttpUrl(value) && (
        <div className="ac-image-preview">
          <img src={value} alt={strings.ImagePreviewAlt} />
        </div>
      )}
    </FormField>
  );
};
