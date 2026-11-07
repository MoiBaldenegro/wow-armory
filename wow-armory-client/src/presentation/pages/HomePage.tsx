import { AuthErrorBanner } from '../components/AuthErrorBanner';
import { CharacterSearchForm } from '../components/CharacterSearchForm';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header/Header';
import { ThemeToggle } from '../components/ThemeToggle';

export function HomePage() {
  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-100 dark:bg-gray-900">
      <Header />
      <ThemeToggle />
      <main className="container mx-auto px-4 py-8 pt-24">
        <AuthErrorBanner />
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
