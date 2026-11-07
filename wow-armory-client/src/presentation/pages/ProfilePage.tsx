import { Link } from 'react-router-dom';
import { ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
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

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-white">
      <Header />
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

          {isLoading && !isAuthenticated ? (
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
