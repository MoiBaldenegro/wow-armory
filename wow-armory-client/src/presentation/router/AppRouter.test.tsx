import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Character } from '../../domain/character/Character';
import { createTestDependencies } from '../../test/fakes';
import { AuthProvider } from '../providers/AuthProvider';
import { UseCasesProvider } from '../providers/UseCasesProvider';
import { AppRouter } from './AppRouter';

function renderAt(path: string, character: Character | null = null) {
  window.history.pushState({}, '', path);
  const { useCases, characterRepository } = createTestDependencies();
  characterRepository.result = character;

  return render(
    <UseCasesProvider useCases={useCases}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </UseCasesProvider>,
  );
}

describe('AppRouter', () => {
  it('renders the home route', () => {
    renderAt('/');

    expect(
      screen.getByRole('heading', { name: 'Busca un personaje', level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders the character profile with repository data', async () => {
    renderAt('/character/grobbulus/billiemoi', {
      name: 'Billiemoi',
      realmSlug: 'grobbulus',
      level: 60,
      characterClass: 'Mage',
      race: 'Gnome',
      itemLevel: 245,
      achievementPoints: 500,
    });

    expect(
      await screen.findByRole('heading', { name: 'Billiemoi', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Gnome · Mage')).toBeInTheDocument();
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
