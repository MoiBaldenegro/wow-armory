import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Character } from '../../domain/character/Character';
import { createTestDependencies } from '../../test/fakes';
import { AuthProvider } from '../providers/AuthProvider';
import { UseCasesProvider } from '../providers/UseCasesProvider';
import { HomePage } from './HomePage';

const featuredCharacter: Character = {
  name: 'Billiemoi',
  realmSlug: 'grobbulus',
  level: 60,
  characterClass: 'Mage',
  race: 'Gnome',
  specialization: 'Frost',
  itemLevel: 245,
  achievementPoints: 12345,
  lastLogin: new Date('2026-10-20T18:30:00Z'),
  guild: {
    name: 'Guardians of Azeroth',
    realm: 'Grobbulus',
    rank: 0,
    memberCount: 42,
  },
  achievements: [
    {
      id: 1,
      name: 'Level 60',
      points: 10,
      completedAt: new Date('2026-10-01T12:00:00Z'),
    },
  ],
};

function renderHome(result: Character | null = null) {
  const { useCases, characterRepository } = createTestDependencies();
  characterRepository.result = result;

  render(
    <UseCasesProvider useCases={useCases}>
      <AuthProvider>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </AuthProvider>
    </UseCasesProvider>,
  );

  return { characterRepository };
}

describe('HomePage', () => {
  it('renders the search and the featured character by default', async () => {
    const { characterRepository } = renderHome(featuredCharacter);

    expect(
      screen.getByRole('heading', { name: 'Busca un personaje', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('search', { name: 'Buscar personaje' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Reino')).toHaveValue('Grobbulus');
    expect(screen.getByLabelText('Nombre')).toHaveValue('Billiemoi');
    expect(screen.getByLabelText('Juego')).toHaveValue('classic');
    expect(
      await screen.findByRole('heading', { name: 'Billiemoi', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Gnome · Frost · Mage')).toBeInTheDocument();
    // The featured card links to the full character page, like the arena ranking.
    const detailHref = '/character/grobbulus/billiemoi?mode=classic';
    expect(screen.getByRole('link', { name: 'Billiemoi' })).toHaveAttribute(
      'href',
      detailHref,
    );
    expect(
      screen.getByRole('link', { name: 'Ver ficha completa de Billiemoi' }),
    ).toHaveAttribute('href', detailHref);
    expect(
      screen.getByRole('region', { name: 'Hermandad' }),
    ).toBeInTheDocument();
    expect(characterRepository.calls).toEqual([
      { realmSlug: 'grobbulus', characterName: 'billiemoi' },
    ]);
    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument();
  });

  it('offers a retry and a link when the featured character is unavailable', async () => {
    renderHome();

    expect(
      await screen.findByRole('heading', { name: 'Billiemoi', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir ficha' })).toHaveAttribute(
      'href',
      '/character/grobbulus/billiemoi?mode=classic',
    );
    expect(screen.queryByText('Thrall')).not.toBeInTheDocument();
  });

  it('keeps showing the auth_error banner from the URL', async () => {
    window.history.replaceState({}, '', '/?auth_error=access_denied');

    renderHome();

    await screen.findByRole('heading', { name: 'Billiemoi', level: 2 });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Has cancelado el inicio de sesión de Battle.net',
    );

    window.history.replaceState({}, '', '/');
  });
});
