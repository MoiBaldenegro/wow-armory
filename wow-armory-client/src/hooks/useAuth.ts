import { useContext } from 'react';
import {
  AuthContext,
  type AuthContextValue,
} from '../providers/auth-context';

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
};
