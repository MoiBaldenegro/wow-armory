import { useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  InvalidSearchInput,
  normalizeCharacterName,
  normalizeRealmSlug,
} from '../../application/character/SearchCharacter';
import { searchErrorMessage } from '../utils/searchErrorMessages';

interface CharacterSearchFormProps {
  initialRealm?: string;
  initialName?: string;
}

interface FieldErrors {
  realm?: string;
  name?: string;
}

function validate<T>(
  normalize: () => T,
): { value: T; error?: undefined } | { value?: undefined; error: string } {
  try {
    return { value: normalize() };
  } catch (error) {
    if (error instanceof InvalidSearchInput) {
      return { error: searchErrorMessage(error) };
    }

    throw error;
  }
}

const inputClassName =
  'w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:border-white dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus-visible:ring-white aria-[invalid=true]:border-red-600 dark:aria-[invalid=true]:border-red-400';

export function CharacterSearchForm({
  initialRealm = '',
  initialName = '',
}: CharacterSearchFormProps) {
  const navigate = useNavigate();
  const id = useId();
  const realmId = `${id}-realm`;
  const nameId = `${id}-name`;
  const realmErrorId = `${id}-realm-error`;
  const nameErrorId = `${id}-name-error`;
  const realmRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [realm, setRealm] = useState(initialRealm);
  const [name, setName] = useState(initialName);
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const realmResult = validate(() => normalizeRealmSlug(realm));
    const nameResult = validate(() => normalizeCharacterName(name));

    if (realmResult.error !== undefined || nameResult.error !== undefined) {
      setErrors({ realm: realmResult.error, name: nameResult.error });
      (realmResult.error !== undefined ? realmRef : nameRef).current?.focus();
      return;
    }

    setErrors({});
    navigate(
      `/character/${encodeURIComponent(realmResult.value)}/${encodeURIComponent(
        nameResult.value,
      )}`,
    );
  };

  return (
    <form
      role="search"
      aria-label="Buscar personaje"
      noValidate
      onSubmit={handleSubmit}
      className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
    >
      <div>
        <label
          htmlFor={realmId}
          className="mb-1 block text-sm font-bold text-gray-900 dark:text-white"
        >
          Reino
        </label>
        <input
          ref={realmRef}
          id={realmId}
          name="realm"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="p. ej. Grobbulus"
          value={realm}
          onChange={(event) => {
            setRealm(event.target.value);
            setErrors((current) => ({ ...current, realm: undefined }));
          }}
          aria-invalid={errors.realm !== undefined}
          aria-describedby={errors.realm !== undefined ? realmErrorId : undefined}
          className={inputClassName}
        />
        {errors.realm !== undefined && (
          <p
            id={realmErrorId}
            className="mt-1 text-sm font-medium text-red-700 dark:text-red-300"
          >
            {errors.realm}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor={nameId}
          className="mb-1 block text-sm font-bold text-gray-900 dark:text-white"
        >
          Nombre
        </label>
        <input
          ref={nameRef}
          id={nameId}
          name="characterName"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="p. ej. Billiemoi"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name !== undefined ? nameErrorId : undefined}
          className={inputClassName}
        />
        {errors.name !== undefined && (
          <p
            id={nameErrorId}
            className="mt-1 text-sm font-medium text-red-700 dark:text-red-300"
          >
            {errors.name}
          </p>
        )}
      </div>
      <button
        type="submit"
        className="rounded-lg border-2 border-black bg-gray-900 px-4 py-2 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0)] transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black sm:mt-6 dark:border-white dark:bg-white dark:text-gray-900 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)] dark:hover:bg-gray-200 dark:focus-visible:ring-white"
      >
        Buscar
      </button>
    </form>
  );
}
