import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWowProfile } from '../../hooks/useWowProfile';
import { ErrorAlert } from '../ui/ErrorAlert';
import { FormField } from '../ui/FormField';
import {
  WOW_MODES,
  parseWowMode,
  type WowMode,
} from '../../../domain/armory/Armory';
import { gameLabel } from '../../utils/armoryFormat';

interface ProfileCharactersProps {
  enabled: boolean;
}

export function ProfileCharacters({ enabled }: ProfileCharactersProps) {
  const profileState = useWowProfile(enabled);
  const [selectedMode, setSelectedMode] = useState<'all' | WowMode>(
    'all',
  );
  const [selectedRealm, setSelectedRealm] = useState('all');

  const availableRealms = useMemo(() => {
    if (profileState.status !== 'success') {
      return [];
    }

    return [
      ...new Map(
        profileState.profile.characters
          .filter(
            (character) =>
              selectedMode === 'all' || character.mode === selectedMode,
          )
          .map((character) => [
            character.realmSlug,
            character.realmName ?? character.realmSlug,
          ]),
      ),
    ].sort(([, first], [, second]) => first.localeCompare(second));
  }, [profileState, selectedMode]);

  const visibleCharacters = useMemo(() => {
    if (profileState.status !== 'success') {
      return [];
    }

    return profileState.profile.characters.filter(
      (character) =>
        (selectedMode === 'all' || character.mode === selectedMode) &&
        (selectedRealm === 'all' || character.realmSlug === selectedRealm),
    );
  }, [profileState, selectedMode, selectedRealm]);

  return (
    <section className="profile-section">
      <h2 className="mx-card__title">Mis personajes</h2>
      <p className="mx-text mx-text--lead profile-section-copy">
        Battle.net separa los personajes por catálogo. Consultamos Retail y
        Classic por separado; por eso un reino solo aparece si Blizzard lo
        devuelve para tu cuenta y región.
      </p>

      <div className="filters">
        <FormField label="Catálogo de personajes" htmlFor="profile-game-mode">
          <select
            id="profile-game-mode"
            value={selectedMode}
            onChange={(event) =>
              setSelectedMode(parseWowMode(event.target.value) ?? 'all')
            }
            className="mx-input mx-select"
          >
            <option value="all">Todos los catálogos</option>
            {WOW_MODES.map((game) => (
              <option key={game} value={game}>
                {gameLabel(game)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Reino disponible en tu cuenta"
          htmlFor="profile-realm"
        >
          <select
            id="profile-realm"
            value={selectedRealm}
            onChange={(event) => setSelectedRealm(event.target.value)}
            className="mx-input mx-select"
          >
            <option value="all">Todos los reinos</option>
            {availableRealms.map(([slug, name]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {profileState.status === 'loading' && (
        <p className="mx-status profile-feedback">
          Cargando personajes de Battle.net…
        </p>
      )}

      {profileState.status === 'error' && (
        <ErrorAlert className="profile-feedback">
          No se pudo cargar la lista de personajes.
        </ErrorAlert>
      )}

      {profileState.status === 'success' &&
        (visibleCharacters.length > 0 ? (
          <ul className="character-list">
            {visibleCharacters.map((character) => (
              <li
                className="character-item"
                key={`${character.mode}-${character.realmSlug}-${character.name}`}
              >
                <Link
                  to={`/character/${encodeURIComponent(
                    character.realmSlug,
                  )}/${encodeURIComponent(
                    character.name.toLowerCase(),
                  )}?mode=${character.mode}`}
                  className="character-link"
                >
                  {character.name}
                </Link>
                <p className="character-meta">
                  <span className="mx-tag mx-tag--sm">{gameLabel(character.mode)}</span>
                  <span>
                    {character.realmName ?? character.realmSlug}
                    {character.level !== undefined
                      ? ` · Nivel ${character.level}`
                      : ''}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mx-text mx-text--secondary profile-feedback">
            No hay personajes en el catálogo seleccionado. Battle.net solo
            muestra personajes vinculados a esta cuenta y región.
          </p>
        ))}
    </section>
  );
}
