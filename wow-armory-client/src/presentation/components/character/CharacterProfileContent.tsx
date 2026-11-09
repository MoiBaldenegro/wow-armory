import { CharacterHero } from './CharacterHero';
import { CharacterStats } from './CharacterStats';
import { CharacterEquipment } from './CharacterEquipment';
import { RecentAchievements } from './RecentAchievements';
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
}

function CharacterMedia({ media }: { media: CharacterDetails['media'] }) {
  const preferred = media.find((asset) => asset.key === 'avatar') ?? media[0];

  return preferred ? (
    <div className="media-frame fade-in">
      <img src={preferred.url} alt="Retrato del personaje" loading="eager" />
    </div>
  ) : null;
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
}: CharacterProfileContentProps) {
  const retryButton = (
    <button type="button" onClick={retry} className="btn btn-primary">
      Reintentar
    </button>
  );

  switch (state.status) {
    case 'loading':
      return (
        <div className="card card-pad">
          <p role="status" className="status-text">
            Cargando personaje…
          </p>
        </div>
      );
    case 'success':
      return (
        <article className="fade-in">
          <CharacterHero
            character={state.character}
            headingLevel={headingLevel}
          />
          {details?.media.length ? (
            <CharacterMedia media={details.media} />
          ) : null}
          <CharacterStats character={state.character} />
          {details?.equipment.length ? (
            <CharacterEquipment equipment={details.equipment} />
          ) : null}
          <RecentAchievements achievements={state.character.achievements} />
        </article>
      );
    case 'not-found':
      return (
        <ProblemCard
          title="Personaje no encontrado"
          message={`No encontramos a ${characterName} en ${realmSlug}.`}
        >
          <CharacterSearchForm
            initialRealm={realmSlug}
            initialName={characterName}
          />
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
