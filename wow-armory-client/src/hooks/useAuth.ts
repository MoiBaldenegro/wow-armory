import axios from 'axios';
import { useEffect, useState } from 'react';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const URI = import.meta.env.VITE_SERVER_URI;

  useEffect(() => {
    const fetchAuthStatus = async () => {
      setIsLoading(true); 
      try {
        const response = await axios(`${URI}/auth/login`, {
          withCredentials: true, 
        });
        if (response.status === 200) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        setIsError(error as Error);
      } finally {
        setIsLoading(false); 
      }
    };

    fetchAuthStatus();
  }, []);

  return { isAuthenticated, isLoading, isError };
};
