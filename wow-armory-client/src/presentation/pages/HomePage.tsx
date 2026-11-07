import { AuthErrorBanner } from '../components/AuthErrorBanner';
import { CharacterSearchForm } from '../components/CharacterSearchForm';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header/Header';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

export function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-100 dark:bg-gray-900">
      <Header />
      <ThemeToggle />
      <main className="container mx-auto px-4 py-8 pt-24">
        <AuthErrorBanner />
        {isAuthenticated && (
          <section className="mb-6 rounded-xl border-2 border-amber-400/60 bg-gray-900 p-5 text-white shadow-[6px_6px_0px_0px_rgba(245,158,11,0.35)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">
              Cuenta conectada
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">
                  {user?.battletag ??
                    (user?.accountId
                      ? `Cuenta ${user.accountId}`
                      : 'Jugador de Battle.net')}
                </h2>
                <p className="mt-1 text-sm text-gray-300">
                  Busca personajes y consulta su ficha de armory.
                </p>
              </div>
              <Link
                to="/profile"
                className="rounded-lg bg-amber-400 px-4 py-2 font-bold text-gray-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                Ver mi perfil
              </Link>
            </div>
          </section>
        )}
        <section
          aria-labelledby="home-title"
          className="mx-auto max-w-3xl rounded-xl border-4 border-black bg-white p-6 text-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0)] sm:p-8 dark:border-white dark:bg-gray-800 dark:text-white dark:shadow-[8px_8px_0px_0px_rgba(255,255,255)]"
        >
          <h1 id="home-title" className="text-3xl font-black">
            Busca un personaje
          </h1>
          <p className="mt-3 mb-6 text-lg text-gray-600 dark:text-gray-300">
            Escribe el reino y el nombre para ver su nivel, hermandad y logros
            recientes.
          </p>
          <CharacterSearchForm />
        </section>
      </main>
      <Footer />
    </div>
  );
}
