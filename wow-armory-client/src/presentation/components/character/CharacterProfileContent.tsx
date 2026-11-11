import { Link } from 'react-router-dom';
import { CharacterHero } from './CharacterHero';
import { CharacterStats } from './CharacterStats';
import { CharacterEquipment } from './CharacterEquipment';
import { RecentAchievements } from './RecentAchievements';
import { CharacterRender } from './CharacterRender';
import { CharacterStatsSheet } from './CharacterStatsSheet';
import { CharacterTalents } from './CharacterTalents';
import { CharacterPvp } from './CharacterPvp';
import { HunterPets } from './HunterPets';
import { WOW_MODES, type WowMode } from '../../../domain/armory/Armory';
import { gameLabel } from '../../utils/armoryFormat';
import { CharacterSearchForm } from '../search/CharacterSearchForm';
import { ProblemCard } from '../feedback/ProblemCard';
import type { CharacterState } from '../../hooks/useCharacter';
import type { CharacterDetails } from '../../../domain/character/CharacterDetails';

interface CharacterProfileContentProps {
  state: CharacterState;
  realmSlug: string;
  characterName: string;
  retry: () => void;
  details: CharacterDetails | null;
  headingLevel?: 1 | 2;
  mode?: WowMode;
  /** Featured cards on the home page only show the summary. */
  compact?: boolean;
  /** Link to the full character page (used by summary cards). */
  detailHref?: string;
}

function renderUrl(details: CharacterDetails | null): string | undefined {
  if (!details) {
    return undefined;
  }

  return (
    details.renderUrl ??
    ['main-raw', 'main', 'inset', 'avatar']
      .map((key) => details.media.find((asset) => asset.key === key)?.url)
      .find((url) => url !== undefined) ??
    details.media[0]?.url
  );
}

function rateLimitMessage(retryAfterSeconds?: number): string {
  if (retryAfterSeconds === undefined) {
    return 'Demasiadas consultas. Espera unos instantes e inténtalo de nuevo.';
  }

  return retryAfterSeconds === 1
    ? 'Demasiadas consultas. Inténtalo de nuevo en 1 segundo.'
    : `Demasiadas consultas. Inténtalo de nuevo en ${retryAfterSeconds} segundos.`;
}

export function CharacterProfileContent({
  state,
  realmSlug,
  characterName,
  retry,
  details,
  headingLevel = 1,
  mode = 'classic',
  compact = false,
  detailHref,
}: CharacterProfileContentProps) {
  const retryButton = (
    <button type="button" onClick={retry} className="mx-button mx-button--accent">
      Reintentar
    </button>
  );

  switch (state.status) {
    case 'loading':
      return (
        <div className="mx-card">
          <p role="status" className="mx-status">
            Cargando personaje…
          </p>
        </div>
      );
    case 'success': {
      const render = renderUrl(details);
      const sectionProps = { realmSlug, characterName, mode };

      return (
        <article className="fade-in">
          <CharacterHero
            character={state.character}
            headingLevel={headingLevel}
            detailHref={detailHref}
          />
          {render ? (
            <CharacterRender url={render} name={state.character.name} />
          ) : null}
          <CharacterStats character={state.character} mode={mode} />
          {!compact && <CharacterStatsSheet {...sectionProps} />}
          {details?.equipment.length ? (
            <CharacterEquipment
              equipment={details.equipment}
              realmSlug={compact ? undefined : realmSlug}
              mode={mode}
              faction={state.character.faction}
            />
          ) : null}
          {!compact && (
            <>
              <CharacterTalents {...sectionProps} />
              <CharacterPvp {...sectionProps} />
              <HunterPets
                {...sectionProps}
                characterClass={state.character.characterClass}
              />
            </>
          )}
          <RecentAchievements achievements={state.character.achievements} />
        </article>
      );
    }
    case 'not-found':
      return (
        <ProblemCard
          title="Personaje no encontrado"
          message={`No encontramos a ${characterName} en ${realmSlug}.`}
        >
          <CharacterSearchForm
            initialRealm={realmSlug}
            initialName={characterName}
            initialMode={mode}
          />
          <p className="problem-alt">
            Cada juego tiene su propio catálogo de reinos y personajes.
          </p>
          <ul className="problem-games">
            {WOW_MODES.filter((game) => game !== mode).map((game) => (
              <li key={game}>
                <Link
                  className="mx-link"
                  to={`/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(
                    characterName,
                  )}?mode=${game}`}
                >
                  Buscar en {gameLabel(game)}
                </Link>
              </li>
            ))}
          </ul>
        </ProblemCard>
      );
    case 'invalid':
      return (
        <ProblemCard
          title="Búsqueda no válida"
          message="El reino o el nombre del personaje no tienen un formato válido. Revisa los datos e inténtalo de nuevo."
        >
          <CharacterSearchForm />
        </ProblemCard>
      );
    case 'rate-limited':
      return (
        <ProblemCard
          title="Demasiadas consultas"
          message={rateLimitMessage(state.retryAfterSeconds)}
        >
          <div className="problem-actions">{retryButton}</div>
        </ProblemCard>
      );
    case 'unavailable':
      return (
        <ProblemCard
          title="Datos no disponibles"
          message="Los datos del personaje no están disponibles ahora mismo. Inténtalo de nuevo en unos minutos."
        >
          <div className="problem-actions">{retryButton}</div>
        </ProblemCard>
      );
  }
}
