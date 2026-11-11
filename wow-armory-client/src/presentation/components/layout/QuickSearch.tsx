import { useId, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  InvalidSearchInput,
  parseCharacterQuery,
} from '../../../application/character/SearchCharacter';
import { parseWowMode } from '../../../domain/armory/Armory';
import { searchErrorMessage } from '../../utils/searchErrorMessages';
import { Icon } from '../ui/Icon';

interface QuickSearchProps {
  isCompact: boolean;
}

export function QuickSearch({ isCompact }: QuickSearchProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Keep the game of the current page (for example the Retail ranking).
  const currentMode = parseWowMode(searchParams.get('mode'));
  const modeQuery = currentMode ? `?mode=${currentMode}` : '';
  const errorId = useId();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const { realmSlug, characterName } = parseCharacterQuery(query);
      setError(null);
      setQuery('');
      navigate(
        `/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(
          characterName,
        )}${modeQuery}`,
      );
    } catch (caught) {
      if (caught instanceof InvalidSearchInput) {
        setError(searchErrorMessage(caught));
        return;
      }

      throw caught;
    }
  };

  return (
    <form
      role="search"
      aria-label="Búsqueda rápida"
      noValidate
      onSubmit={handleSubmit}
      className={`mx-search quick-search${isCompact ? ' is-compact' : ''}`}
    >
      <div className="mx-search__form">
      <Icon className="mx-search__icon" name="search" size={16} />
      <input
        className="mx-search__input"
        type="text"
        name="q"
        autoComplete="off"
        spellCheck={false}
        placeholder="Buscar: reino/nombre"
        aria-label="Buscar personaje"
        aria-invalid={error !== null}
        aria-describedby={error !== null ? errorId : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setError(null);
        }}
      />
      </div>
      {error !== null && (
        <p id={errorId} role="alert" className="mx-field__error quick-search-error">
          {error}
        </p>
      )}
    </form>
  );
}
