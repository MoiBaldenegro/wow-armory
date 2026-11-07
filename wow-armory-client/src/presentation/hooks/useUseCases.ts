import { useContext } from 'react';
import type { UseCases } from '../../infrastructure/container';
import { UseCasesContext } from '../providers/use-cases-context';

export function useUseCases(): UseCases {
  const context = useContext(UseCasesContext);

  if (!context) {
    throw new Error('useUseCases must be used inside a UseCasesProvider.');
  }

  return context;
}
