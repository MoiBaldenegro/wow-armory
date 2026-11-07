import type { ReactNode } from 'react';
import type { UseCases } from '../../infrastructure/container';
import { UseCasesContext } from './use-cases-context';

interface UseCasesProviderProps {
  useCases: UseCases;
  children: ReactNode;
}

export function UseCasesProvider({
  useCases,
  children,
}: UseCasesProviderProps) {
  return (
    <UseCasesContext.Provider value={useCases}>
      {children}
    </UseCasesContext.Provider>
  );
}
