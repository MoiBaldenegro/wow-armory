import { useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  InvalidSearchInput,
  normalizeCharacterName,
  normalizeRealmSlug,
} from '../../../application/character/SearchCharacter';
import { searchErrorMessage } from '../../utils/searchErrorMessages';
import { FormField } from '../ui/FormField';

interface CharacterSearchFormProps {
  initialRealm?: string;
  initialName?: string;
  initialMode?: 'retail' | 'classic';
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

export function CharacterSearchForm({
  initialRealm = '',
  initialName = '',
  initialMode = 'classic',
}: CharacterSearchFormProps) {
  const navigate = useNavigate();
  const id = useId();
  const realmId = `${id}-realm`;
  const nameId = `${id}-name`;
  const modeId = `${id}-mode`;
  const realmErrorId = `${id}-realm-error`;
  const nameErrorId = `${id}-name-error`;
  const realmRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [realm, setRealm] = useState(initialRealm);
  const [name, setName] = useState(initialName);
  const [mode, setMode] = useState<'retail' | 'classic'>(initialMode);
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
      )}?mode=${mode}`,
    );
  };

  return (
    <form
      role="search"
      aria-label="Buscar personaje"
      noValidate
      onSubmit={handleSubmit}
      className="search-form"
    >
      <FormField
        label="Reino"
        htmlFor={realmId}
        error={errors.realm}
        errorId={realmErrorId}
      >
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
          className="input"
        />
      </FormField>

      <FormField
        label="Nombre"
        htmlFor={nameId}
        error={errors.name}
        errorId={nameErrorId}
      >
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
          className="input"
        />
      </FormField>

      <FormField label="Juego" htmlFor={modeId}>
        <select
          id={modeId}
          value={mode}
          onChange={(event) =>
            setMode(event.target.value as 'retail' | 'classic')
          }
          className="select"
        >
          <option value="classic">Classic</option>
          <option value="retail">Retail</option>
        </select>
      </FormField>

      <button type="submit" className="btn btn-primary search-submit">
        Buscar
      </button>
    </form>
  );
}
