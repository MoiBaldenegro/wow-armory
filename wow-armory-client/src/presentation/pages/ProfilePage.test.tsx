import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { UseCases } from '../../infrastructure/container';
import { createTestDependencies } from '../../test/fakes';
import { AuthProvider } from '../providers/AuthProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import { UseCasesProvider } from '../providers/UseCasesProvider';
import { ProfilePage } from './ProfilePage';

function renderProfile(useCases: UseCases) {
  return render(
    <UseCasesProvider useCases={useCases}>
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter>
            <ProfilePage />
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    </UseCasesProvider>,
  );
}

describe('ProfilePage', () => {
  it('shows a loading state while the session is being checked', () => {
    const { useCases } = createTestDependencies({
      checkSession: {
        execute: () => new Promise(() => undefined),
      } as unknown as UseCases['checkSession'],
    });

    renderProfile(useCases);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando perfil…');
  });

  it('shows the battletag and logout action when authenticated', async () => {
    const { useCases, authRepository } = createTestDependencies();
    authRepository.session = {
      authenticated: true,
      user: { battletag: 'Player#1234' },
    };

    renderProfile(useCases);

    expect(
      await screen.findByText('Player#1234'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cerrar sesión' }),
    ).toBeInTheDocument();
  });

  it('shows the login action when not authenticated', async () => {
    const { useCases } = createTestDependencies();

    renderProfile(useCases);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Iniciar sesión' }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText('Inicia sesión con Battle.net para ver tu perfil.'),
    ).toBeInTheDocument();
  });
});
