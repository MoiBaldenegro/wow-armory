import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useWowProfile } from '../hooks/useWowProfile';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header/Header';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  WarcraftCard,
  WarcraftCardContent,
  WarcraftCardHeader,
} from '../components/warcraftcn/WarcraftCard';

export function ProfilePage() {
  const { isAuthenticated, isLoading, error, user, login, logout } = useAuth();
  const profileState = useWowProfile(isAuthenticated);
  const [hasCheckedSession, setHasCheckedSession] = useState(!isLoading);
  const [selectedMode, setSelectedMode] = useState<'all' | 'retail' | 'classic'>(
    'all',
  );
  const [selectedRealm, setSelectedRealm] = useState('all');
  const availableRealms = useMemo(() => {
    if (profileState.status !== 'success') {
      return [];
    }

    return [...new Map(
      profileState.profile.characters
        .filter(
          (character) =>
            selectedMode === 'all' || character.mode === selectedMode,
        )
        .map((character) => [
          character.realmSlug,
          character.realmName ?? character.realmSlug,
        ]),
    )].sort(([, first], [, second]) => first.localeCompare(second));
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

  useEffect(() => {
    if (!isLoading) {
      setHasCheckedSession(true);
    }
  }, [isLoading]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-white">
      <Header showAuthAction={false} />
      <ThemeToggle />
      <main className="container mx-auto max-w-5xl px-4 py-8 pt-24">
        <WarcraftCard className="p-2 sm:p-4">
          <WarcraftCardHeader>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <AzerothCrest />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
                  Battle.net conectado
                </p>
                <h1 className="text-4xl font-black text-amber-100">
                  Mi perfil
                </h1>
                <p className="mt-2 text-amber-50/70">
                  Tu identidad de Battle.net aparece aquí después del inicio de
                  sesión. Tus personajes se consultan desde el buscador.
                </p>
              </div>
            </div>
          </WarcraftCardHeader>

          {error && (
            <div
              role="alert"
              className="mx-4 mt-6 rounded-lg border border-red-300 bg-red-950/80 px-4 py-3 text-sm text-red-100"
            >
              {error}
            </div>
          )}

          {!hasCheckedSession ? (
            <p role="status" className="p-6 text-amber-50/75">
              Cargando perfil…
            </p>
          ) : isAuthenticated ? (
            <WarcraftCardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileValue label="BattleTag">
                  {user?.battletag ?? 'Battle.net conectado'}
                </ProfileValue>
                <ProfileValue label="ID de cuenta">
                  {user?.accountId ?? 'No proporcionado por Battle.net'}
                </ProfileValue>
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/50 p-5">
                  <p className="text-sm font-semibold text-emerald-200/70">
                    Estado
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-xl font-black text-emerald-300">
                    <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                    Sesión activa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                disabled={isLoading}
                aria-busy={isLoading}
                className="mt-6 rounded-lg border border-amber-300/60 bg-amber-400 px-4 py-2 font-bold text-slate-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Cerrando sesión…' : 'Cerrar sesión'}
              </button>
              <section className="mt-8 border-t border-amber-300/20 pt-6">
                <h2 className="text-2xl font-black text-amber-100">
                  Mis personajes
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-amber-50/70">
                  Battle.net separa los personajes por catálogo. Consultamos
                  Retail y Classic por separado; por eso un reino solo aparece
                  si Blizzard lo devuelve para tu cuenta y región.
                </p>
                <label
                  htmlFor="profile-game-mode"
                  className="mt-4 block max-w-xs text-sm font-bold text-amber-100"
                >
                  Catálogo de personajes
                  <select
                    id="profile-game-mode"
                    value={selectedMode}
                    onChange={(event) =>
                      setSelectedMode(
                        event.target.value as 'all' | 'retail' | 'classic',
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-amber-300/40 bg-black/50 px-3 py-2 text-amber-50"
                  >
                    <option value="all">Todos los catálogos</option>
                    <option value="retail">Retail</option>
                    <option value="classic">Classic</option>
                  </select>
                </label>
                <label
                  htmlFor="profile-realm"
                  className="mt-4 block max-w-xs text-sm font-bold text-amber-100"
                >
                  Reino disponible en tu cuenta
                  <select
                    id="profile-realm"
                    value={selectedRealm}
                    onChange={(event) => setSelectedRealm(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-amber-300/40 bg-black/50 px-3 py-2 text-amber-50"
                  >
                    <option value="all">Todos los reinos</option>
                    {availableRealms.map(([slug, name]) => (
                      <option key={slug} value={slug}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                {profileState.status === 'loading' && (
                  <p className="mt-3 text-amber-50/70">
                    Cargando personajes de Battle.net…
                  </p>
                )}
                {profileState.status === 'error' && (
                  <p role="alert" className="mt-3 text-red-200">
                    No se pudo cargar la lista de personajes.
                  </p>
                )}
                {profileState.status === 'success' &&
                  (visibleCharacters.length > 0 ? (
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                      {visibleCharacters.map((character) => (
                        <li
                          key={`${character.mode}-${character.realmSlug}-${character.name}`}
                          className="rounded-lg border border-amber-300/30 bg-black/25 p-4"
                        >
                          <Link
                            to={`/character/${encodeURIComponent(
                              character.realmSlug,
                            )}/${encodeURIComponent(
                              character.name.toLowerCase(),
                            )}?mode=${character.mode}`}
                            className="font-bold text-amber-100 hover:text-amber-300"
                          >
                            {character.name}
                          </Link>
                          <p className="mt-1 text-sm text-amber-50/65">
                            <span className="mr-2 uppercase tracking-wide text-amber-300/80">
                              {character.mode}
                            </span>
                            {character.realmName ?? character.realmSlug}
                            {character.level !== undefined
                              ? ` · Nivel ${character.level}`
                              : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-amber-50/70">
                      No hay personajes en el catálogo seleccionado. Battle.net
                      solo muestra personajes vinculados a esta cuenta y
                      región.
                    </p>
                  ))}
              </section>
            </WarcraftCardContent>
          ) : (
            <WarcraftCardContent>
              <p className="text-lg text-amber-50/80">
                Inicia sesión con Battle.net para ver tu perfil.
              </p>
              <button
                type="button"
                onClick={() => void login()}
                disabled={isLoading}
                aria-busy={isLoading}
                className="mt-6 rounded-lg border border-amber-300/60 bg-amber-400 px-4 py-2 font-bold text-slate-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}
              </button>
            </WarcraftCardContent>
          )}

        <Link
          to="/"
          className="m-4 inline-block font-bold text-amber-200 underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
        >
          Volver al inicio
        </Link>
        </WarcraftCard>
      </main>
      <Footer />
    </div>
  );
}

function ProfileValue({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  return (
    <div className="rounded-lg border border-amber-300/30 bg-black/25 p-5">
      <p className="text-sm font-semibold text-amber-200/70">{label}</p>
      <p className="mt-2 break-all text-xl font-black text-amber-50">
        {children}
      </p>
    </div>
  );
}

function AzerothCrest() {
  return (
    <div
      aria-label="Emblema de Azeroth"
      role="img"
      className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-amber-300 bg-amber-900/80 shadow-[0_0_30px_rgba(245,158,11,0.35)]"
    >
      <UserRound className="h-14 w-14 text-amber-200" aria-hidden="true" />
    </div>
  );
}
