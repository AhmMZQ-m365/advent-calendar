import * as React from 'react';
import * as strings from 'AdventCalendarWebPartStrings';
import { IAdventServices } from '../../services/AdventServices';
import { IUserSuggestion } from '../../models/IAdmin';
import { Icon } from '../../theme/Icons';
import { format } from '../../services/format';
import { Avatar } from '../common/Avatar';
import { useFieldId } from '../../hooks/useFieldId';

export interface IUserPickerProps {
  services: IAdventServices;
  inputId: string;
  selected: IUserSuggestion | undefined;
  disabled?: boolean;
  onChange: (user: IUserSuggestion | undefined) => void;
}

const SEARCH_DELAY_MS = 300;
const MIN_QUERY_LENGTH = 2;

/**
 * Sélecteur de personnes (utilisateurs uniquement), basé sur clientPeoplePickerSearchUser, en HTML natif.
 * Façon Combobox / Command shadcn : champ de recherche avec icône, liste déroulante (avatar à initiales, nom, e-mail),
 * états « chargement », « aucun résultat » et aide de saisie. Clavier : flèches, Entrée, Échap.
 */
export const UserPicker: React.FC<IUserPickerProps> = ({ services, inputId, selected, disabled, onChange }) => {
  const [query, setQuery] = React.useState<string>('');
  const [results, setResults] = React.useState<IUserSuggestion[]>([]);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [isSearching, setIsSearching] = React.useState<boolean>(false);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const listId = useFieldId('adv-user-list');

  React.useEffect(() => {
    const text = query.trim();
    if (text.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsSearching(false);
      return undefined;
    }
    let isCurrent = true;
    setIsSearching(true);
    const timer = window.setTimeout(() => {
      services.admins.searchUsers(text)
        .then((users) => {
          if (isCurrent) {
            setResults(users);
            setActiveIndex(users.length > 0 ? 0 : -1);
          }
        })
        .catch(() => {
          if (isCurrent) {
            setResults([]);
          }
        })
        .finally(() => {
          if (isCurrent) {
            setIsSearching(false);
          }
        });
    }, SEARCH_DELAY_MS);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [query, services]);

  const choose = (user: IUserSuggestion): void => {
    onChange(user);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter' && isOpen && results[activeIndex]) {
      event.preventDefault();
      choose(results[activeIndex]);
    } else if (event.key === 'Escape' && isOpen) {
      // Ferme seulement la liste, sans fermer la modale éventuelle.
      event.stopPropagation();
      setIsOpen(false);
    }
  };

  if (selected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', minHeight: '36px' }}>
        <span className="ac-chip">
          <Avatar name={selected.displayName} size="sm" />
          <span className="ac-chip-label">{selected.displayName}</span>
          <button
            type="button"
            className="ac-chip-x"
            onClick={() => onChange(undefined)}
            disabled={disabled}
            aria-label={format(strings.RemoveFilter, selected.displayName)}
          >
            <Icon name="close" size={14} />
          </button>
        </span>
      </div>
    );
  }

  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;
  const activeOptionId = hasQuery && !isSearching && activeIndex >= 0 && results[activeIndex]
    ? `${listId}-option-${activeIndex}`
    : undefined;

  return (
    <div className="ac-combobox">
      <div className="ac-input-wrap ac-input-wrap--icon">
        <span className="ac-input-icon"><Icon name="search" size={16} /></span>
        <input
          id={inputId}
          className="ac-input"
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          placeholder={strings.PeoplePickerPlaceholder}
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {isOpen && (
        <ul id={listId} role="listbox" className="ac-popover ac-scroll" aria-label={strings.PeoplePickerPlaceholder}>
          {!hasQuery && (
            <li role="presentation" className="ac-popover-hint">{strings.PeoplePickerHint}</li>
          )}
          {hasQuery && isSearching && (
            <li role="presentation" className="ac-popover-hint">
              <span className="ac-spinner" aria-hidden="true" />
              {strings.Loading}
            </li>
          )}
          {hasQuery && !isSearching && results.length === 0 && (
            <li role="presentation" className="ac-popover-hint">
              <Icon name="search" size={16} />
              {strings.PeoplePickerNoResults}
            </li>
          )}
          {hasQuery && !isSearching && results.map((user, index) => (
            <li
              key={user.loginName}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className="ac-option"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(user)}
            >
              <Avatar name={user.displayName} size="sm" />
              <span className="ac-option-main">
                <span>{user.displayName}</span>
                {user.email && <span className="ac-option-sub">{user.email}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
