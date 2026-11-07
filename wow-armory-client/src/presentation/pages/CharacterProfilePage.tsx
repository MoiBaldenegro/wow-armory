import type { ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CharacterBanner } from '../components/CharacterBanner';
import { CharacterCard } from '../components/CharacterCard';
import { CharacterSearchForm } from '../components/CharacterSearchForm';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header/Header';
import { RecentAchievements } from '../components/RecentAchievements';
import { ThemeToggle } from '../components/ThemeToggle';
import { useCharacter, type CharacterState } from '../hooks/useCharacter';
import { useCharacterDetails } from '../hooks/useCharacterDetails';
import type { CharacterDetails } from '../../domain/character/CharacterDetails';

const cardClassName =
  'mx-auto max-w-3xl rounded-xl border-4 border-black bg-white p-6 text-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0)] sm:p-8 dark:border-white dark:bg-gray-800 dark:text-white dark:shadow-[8px_8px_0px_0px_rgba(255,255,255)]';

const alertClassName =
  'rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200';

const primaryButtonClassName =
  'rounded-lg border-2 border-black bg-gray-900 px-4 py-2 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0)] transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:border-white dark:bg-white dark:text-gray-900 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)] dark:hover:bg-gray-200 dark:focus-visible:ring-white';

const homeLinkClassName =
  'inline-block font-bold text-gray-700 underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:text-gray-200 dark:focus-visible:ring-white';

interface ProblemProps {
  title: string;
  message: string;
  children?: ReactNode;
}

function CharacterMedia({
  media,
}: {
  media: Array<{ key: string; url: string }>;
}) {
  const preferred = media.find((asset) => asset.key === 'avatar') ?? media[0];

  return preferred ? (
    <div className="mx-auto mb-8 max-w-3xl overflow-hidden rounded-xl border-4 border-black bg-slate-950 shadow-[8px_8px_0px_0px_rgba(0,0,0)] dark:border-white">
      <img
        src={preferred.url}
        alt="Retrato del personaje"
        className="mx-auto max-h-96 w-full object-contain"
        loading="eager"
      />
    </div>
  ) : null;
}

function CharacterEquipment({
  equipment,
}: {
  equipment: Array<{
    slot: string;
    name: string;
    level?: number;
    quality?: string;
    iconUrl?: string;
  }>;
}) {
  return (
    <section className="mb-8 rounded-xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0)] dark:border-white dark:bg-gray-800 dark:shadow-[8px_8px_0px_0px_rgba(255,255,255)]">
      <h2 className="mb-5 text-2xl font-black dark:text-white">
        Equipamiento
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {equipment.map((item) => (
          <li
            key={`${item.slot}-${item.name}`}
            className="flex items-center gap-3 rounded-lg border-2 border-gray-200 p-3 dark:border-gray-700"
          >
            {item.iconUrl ? (
              <img
                src={item.iconUrl}
                alt=""
                className="h-12 w-12 rounded border border-amber-500 object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-gray-200 dark:bg-gray-700" />
            )}
            <div className="min-w-0">
              <p className="truncate font-bold dark:text-white">{item.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {item.slot}
                {item.level !== undefined ? ` · Nivel ${item.level}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Problem({ title, message, children }: ProblemProps) {
  return (
    <div className={cardClassName}>
      <h1 className="text-3xl font-black">{title}</h1>
      <p role="alert" className={`mt-6 ${alertClassName}`}>
        {message}
      </p>
      <div className="mt-6 space-y-6">{children}</div>
      <Link to="/" className={`mt-8 ${homeLinkClassName}`}>
        Volver al inicio
      </Link>
    </div>
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

interface CharacterContentProps {
  state: CharacterState;
  realmSlug: string;
  characterName: string;
  retry: () => void;
  details: CharacterDetails | null;
}

function CharacterContent({
  state,
  realmSlug,
  characterName,
  retry,
  details,
}: CharacterContentProps) {
  const retryButton = (
    <button type="button" onClick={retry} className={primaryButtonClassName}>
      Reintentar
    </button>
  );

  switch (state.status) {
    case 'loading':
      return (
        <div className={cardClassName}>
          <p
            role="status"
            className="text-lg font-bold text-gray-600 dark:text-gray-300"
          >
            Cargando personaje…
          </p>
        </div>
      );
    case 'success':
      return (
        <article>
          <CharacterBanner character={state.character} />
          {details?.media.length ? (
            <CharacterMedia media={details.media} />
          ) : null}
          <CharacterCard character={state.character} />
          {details?.equipment.length ? (
            <CharacterEquipment equipment={details.equipment} />
          ) : null}
          <RecentAchievements achievements={state.character.achievements} />
        </article>
      );
    case 'not-found':
      return (
        <Problem
          title="Personaje no encontrado"
          message={`No encontramos a ${characterName} en ${realmSlug}.`}
        >
          <CharacterSearchForm
            initialRealm={realmSlug}
            initialName={characterName}
          />
        </Problem>
      );
    case 'invalid':
      return (
        <Problem
          title="Búsqueda no válida"
          message="El reino o el nombre del personaje no tienen un formato válido. Revisa los datos e inténtalo de nuevo."
        >
          <CharacterSearchForm />
        </Problem>
      );
    case 'rate-limited':
      return (
        <Problem
          title="Demasiadas consultas"
          message={rateLimitMessage(state.retryAfterSeconds)}
        >
          {retryButton}
        </Problem>
      );
    case 'unavailable':
      return (
        <Problem
          title="Datos no disponibles"
          message="Los datos del personaje no están disponibles ahora mismo. Inténtalo de nuevo en unos minutos."
        >
          {retryButton}
        </Problem>
      );
  }
}

export function CharacterProfilePage() {
  const { realmSlug = '', characterName = '' } = useParams<{
    realmSlug: string;
    characterName: string;
  }>();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'retail' ? 'retail' : 'classic';
  const { state, retry } = useCharacter(realmSlug, characterName, mode);
  const details = useCharacterDetails(realmSlug, characterName, mode);

  return (
    <div className="min-h-screen bg-gray-100 transition-colors duration-300 dark:bg-gray-900">
      <Header />
      <ThemeToggle />
      <main className="container mx-auto px-4 py-8 pt-24">
        <CharacterContent
          key={`${realmSlug}/${characterName}/${mode}`}
          state={state}
          realmSlug={realmSlug}
          characterName={characterName}
          retry={retry}
          details={details}
        />
      </main>
      <Footer />
    </div>
  );
}
