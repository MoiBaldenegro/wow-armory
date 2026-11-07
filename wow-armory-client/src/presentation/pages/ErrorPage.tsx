import { Link, useSearchParams } from 'react-router-dom';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    'Has cancelado el inicio de sesión de Battle.net. Puedes intentarlo de nuevo.',
  invalid_state:
    'La solicitud de inicio de sesión ha caducado. Inténtalo de nuevo.',
  auth_failed:
    'No se pudo completar el inicio de sesión con Battle.net. Inténtalo de nuevo.',
};

const GENERIC_ERROR =
  'No se pudo completar la autenticación. Inténtalo de nuevo.';

export function ErrorPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('auth_error') ?? searchParams.get('code');
  const message = code ? AUTH_ERROR_MESSAGES[code] ?? GENERIC_ERROR : GENERIC_ERROR;

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-16 text-gray-900 dark:bg-gray-900 dark:text-white">
      <div className="mx-auto max-w-3xl rounded-xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0)] sm:p-8 dark:border-white dark:bg-gray-800 dark:shadow-[8px_8px_0px_0px_rgba(255,255,255)]">
        <h1 className="text-3xl font-black">Algo salió mal</h1>
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {message}
        </p>
        {code && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Código de error: <code>{code}</code>
          </p>
        )}
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
