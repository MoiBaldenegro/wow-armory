import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createUseCases } from './infrastructure/container';
import { AuthProvider } from './presentation/providers/AuthProvider';
import { UseCasesProvider } from './presentation/providers/UseCasesProvider';
import { AppRouter } from './presentation/router/AppRouter';
// Design system MXVI (copia sincronizada, scripts/sync-mxvi.mjs) y estilos propios de la app.
import './styles/mxvi/tokens.css';
import './styles/mxvi/fonts.css';
import './styles/mxvi/base.css';
import './styles/mxvi/components.css';
import './styles/armory.css';

const useCases = createUseCases();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UseCasesProvider useCases={useCases}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </UseCasesProvider>
  </StrictMode>,
);
