import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

type dataType<T> = T | null;
type errorType = Error | null;

interface Params<T> {
  data: dataType<T>;
  isLoading: boolean;
  isError: errorType;
}

export const useDetail = <T>(url: string): Params<T> => {
  const [data, setData] = useState<dataType<T>>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState<Error | null>(null);

  const fetchData = useCallback(
    async (abortSignal: AbortSignal) => {
      //reset state before executions
      setIsLoading(true);
      setIsError(null);

      try {
        // Obtén el token de las cookies (suponiendo que usas document.cookie)
        const accessToken = document.cookie
          .split('; ')
          .find((row) => row.startsWith('accessToken='))
          ?.split('=')[1];
          console.log(accessToken);

        // Si no se encuentra el token
        if (!accessToken) {
          console.log('No se encontro el token');
          setIsLoading(false);
          setIsError(new Error('Token de acceso no encontrado.'));
          return;
        }
        console.log(`Token encontrado: ${accessToken}`);

        // Realiza la solicitud con el token en los headers
        const response = await axios(url, {
          signal: abortSignal,
          headers: {
            Authorization: `Bearer ${accessToken}`, // Incluir el token en los headers
          },
        });

        if (!response) {
          setIsLoading(false);
          setIsError(
            new Error(
              'Hubo un error en la solicitud de la API, revisa tu conexión y reintenta.',
            ),
          );
          return;
        }

        setData(response.data as dataType<T>);
      } catch (error) {
        if (axios.isCancel(error)) {
          setIsLoading(false);
          setIsError(error as Error);
          return;
        }
        setIsLoading(false);
        setIsError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [url],
  );

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchData]);

  return { data, isLoading, isError };
};

export default useDetail;
