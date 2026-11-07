import { useId, useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  InvalidSearchInput,
  parseCharacterQuery,
} from '../../../application/character/SearchCharacter';
import { searchErrorMessage } from '../../utils/searchErrorMessages';

interface SearchBarProps {
  isCompact: boolean;
}

export function SearchBar({ isCompact }: SearchBarProps) {
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
      className="relative w-full min-w-0 transition-all duration-300"
    >
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
        className={`w-full min-w-0 rounded-lg border border-white/20 bg-white/10 pr-4 pl-10 text-white placeholder-white/50 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none aria-[invalid=true]:border-red-400 ${
          isCompact ? 'py-1.5' : 'py-2'
        }`}
        onChange={(event) => {
          setQuery(event.target.value);
          setError(null);
        }}
      />
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-white/70"
        aria-hidden="true"
      />
      {error !== null && (
        <p
          id={errorId}
          role="alert"
          className="absolute left-0 right-0 top-full mt-2 rounded-lg border-2 border-black bg-red-50 px-3 py-2 text-sm font-medium text-red-800 shadow-[4px_4px_0px_0px_rgba(0,0,0)] dark:border-white dark:bg-red-950 dark:text-red-200 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)]"
        >
          {error}
        </p>
      )}
    </form>
  );
}
