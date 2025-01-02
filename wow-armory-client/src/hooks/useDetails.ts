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
        const response = await axios(url, {
          signal: abortSignal,
        });
        if (!response) {
          setIsLoading(false);
          setIsError(
            new Error(
              'Hubo un eror en al solicitud de la API, revisa tu conexion y reintenta.',
            ),
          );
          return;
        }
        setData(response.data as dataType<T>);
        return;
      } catch (error) {
        if (axios.isCancel(error)) {
          setIsLoading(false);
          setIsError(error as Error);
          return;
        }
        setIsLoading(false);
        setIsError(error as Error);
        return;
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
    console.log(data);
    return () => {
      controller.abort();
    };
  }, [fetchData]);

  return { data, isLoading, isError };
};

export default useDetail;