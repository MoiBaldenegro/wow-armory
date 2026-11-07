import { createContext } from 'react';
import type { UseCases } from '../../infrastructure/container';

export const UseCasesContext = createContext<UseCases | undefined>(undefined);
