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
      setIsLoading(true);
      setIsError(null);

      try {
        const response = await axios.get<T>(url, {
          signal: abortSignal,
          withCredentials: true,
        });

        setData(response.data);
      } catch (error) {
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
  }, [fetchData, url]);

  return { data, isLoading, isError };
};

export default useDetail;
