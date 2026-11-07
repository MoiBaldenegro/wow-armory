import { Link, useParams } from 'react-router-dom';

export function CharacterProfilePage() {
  const { realmSlug, characterName } = useParams<{
    realmSlug: string;
    characterName: string;
  }>();

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-16 text-gray-900 dark:bg-gray-900 dark:text-white">
      <div className="mx-auto max-w-3xl rounded-xl border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0)] dark:border-white dark:bg-gray-800 dark:shadow-[8px_8px_0px_0px_rgba(255,255,255)]">
        <h1 className="text-3xl font-black">Ficha de personaje</h1>
        <p className="mt-4 text-gray-600 dark:text-gray-300">
          {realmSlug && characterName
            ? `Todavía no hay datos para ${characterName} de ${realmSlug}.`
            : 'Todavía no hay un personaje seleccionado.'}
        </p>
        <p
          role="status"
          className="mt-2 text-sm text-gray-500 dark:text-gray-400"
        >
          La ficha real llegará en una próxima actualización.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block rounded-lg border-2 border-black bg-gray-900 px-4 py-2 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0)] transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:border-white dark:bg-white dark:text-gray-900 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255)] dark:hover:bg-gray-200 dark:focus-visible:ring-white"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
