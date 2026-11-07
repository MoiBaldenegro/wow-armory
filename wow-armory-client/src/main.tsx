import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createUseCases } from './infrastructure/container';
import { AuthProvider } from './presentation/providers/AuthProvider';
import { ThemeProvider } from './presentation/providers/ThemeProvider';
import { UseCasesProvider } from './presentation/providers/UseCasesProvider';
import { AppRouter } from './presentation/router/AppRouter';
import './index.css';

const useCases = createUseCases();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UseCasesProvider useCases={useCases}>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </UseCasesProvider>
  </StrictMode>,
);
