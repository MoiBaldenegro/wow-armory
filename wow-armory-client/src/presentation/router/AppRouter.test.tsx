import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTestDependencies } from '../../test/fakes';
import { AuthProvider } from '../providers/AuthProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import { UseCasesProvider } from '../providers/UseCasesProvider';
import { AppRouter } from './AppRouter';

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  const { useCases } = createTestDependencies();

  return render(
    <UseCasesProvider useCases={useCases}>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </UseCasesProvider>,
  );
}

describe('AppRouter', () => {
  it('renders the home route', () => {
    renderAt('/');

    expect(
      screen.getByRole('heading', { name: 'Thrall', level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders the character profile shell with the route params', () => {
    renderAt('/character/grobbulus/billiemoi');

    expect(
      screen.getByRole('heading', { name: 'Ficha de personaje' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Todavía no hay datos para billiemoi de grobbulus.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the profile route', () => {
    renderAt('/profile');

    expect(
      screen.getByRole('heading', { name: 'Mi perfil' }),
    ).toBeInTheDocument();
  });

  it('renders the error route with auth_error or code', () => {
    renderAt('/error?code=auth_failed');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo completar el inicio de sesión con Battle.net',
    );
  });

  it('renders the not found page for unknown routes', () => {
    renderAt('/does-not-exist');

    expect(
      screen.getByRole('heading', { name: 'Página no encontrada' }),
    ).toBeInTheDocument();
  });
});
