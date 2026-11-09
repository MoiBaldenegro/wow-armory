import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  InvalidSearchInput,
  parseCharacterQuery,
} from '../../../application/character/SearchCharacter';
import { searchErrorMessage } from '../../utils/searchErrorMessages';
import { Icon } from '../ui/Icon';

interface QuickSearchProps {
  isCompact: boolean;
}

export function QuickSearch({ isCompact }: QuickSearchProps) {
  const navigate = useNavigate();
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
        )}`,
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
      className={`quick-search${isCompact ? ' is-compact' : ''}`}
    >
      <Icon className="quick-search-icon" name="search" size={17} />
      <input
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
      {error !== null && (
        <p id={errorId} role="alert" className="form-error quick-search-error">
          {error}
        </p>
      )}
    </form>
  );
}
