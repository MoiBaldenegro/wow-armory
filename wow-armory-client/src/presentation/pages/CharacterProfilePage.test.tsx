import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Character } from '../../domain/character/Character';
import {
  CharacterRateLimited,
  CharacterUnavailable,
} from '../../domain/character/errors/CharacterErrors';
import type { UseCases } from '../../infrastructure/container';
import { createTestDependencies } from '../../test/fakes';
import { AuthProvider } from '../providers/AuthProvider';
import { UseCasesProvider } from '../providers/UseCasesProvider';
import { AppRoutes } from '../router/AppRouter';

const fullCharacter: Character = {
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
    { name: 'Explorer' },
  ],
};

const minimalCharacter: Character = {
  name: 'Newbie',
  realmSlug: 'grobbulus',
  level: 1,
  characterClass: 'Warrior',
  race: 'Orc',
  itemLevel: 0,
  achievementPoints: 0,
};

function renderProfileAt(path: string, useCases: UseCases) {
  return render(
    <UseCasesProvider useCases={useCases}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </UseCasesProvider>,
  );
}

function detailValue(label: string): string | null {
  const term = screen.getByText(label, { selector: 'dt' });
  return term.nextElementSibling?.textContent ?? null;
}

describe('CharacterProfilePage', () => {
  it('mounts the header, main navigation and footer', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.result = fullCharacter;

    renderProfileAt('/character/grobbulus/billiemoi', useCases);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Billiemoi', level: 1 });
  });

  it('shows the game switch and loads the other game on demand', async () => {
    const user = userEvent.setup();
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.result = fullCharacter;

    renderProfileAt('/character/grobbulus/billiemoi?mode=classic', useCases);

    const games = screen.getByRole('group', { name: 'Juego' });
    expect(within(games).getByRole('button', { name: 'Classic' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(games).getByRole('button', { name: 'Retail' }));

    await waitFor(() => expect(characterRepository.modes).toContain('retail'));
    expect(
      within(screen.getByRole('group', { name: 'Juego' })).getByRole('button', {
        name: 'Retail',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('tries the next game when no game is given and Classic has no character', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    // An Anniversary (TBC) character, e.g. from Nightslayer, only exists in `classicann`.
    characterRepository.resultsByMode = {
      classic: null,
      classicann: fullCharacter,
    };

    renderProfileAt('/character/nightslayer/billiemoi', useCases);

    await screen.findByRole('heading', { name: 'Billiemoi', level: 1 });
    expect(characterRepository.modes).toEqual(['classic', 'classicann']);
    expect(
      within(screen.getByRole('group', { name: 'Juego' })).getByRole('button', {
        name: 'TBC Aniversario',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports not found only after trying every game', async () => {
    const { useCases, characterRepository } = createTestDependencies();

    renderProfileAt('/character/grobbulus/ghost', useCases);

    await screen.findByRole('heading', { name: 'Personaje no encontrado' });
    expect(characterRepository.modes).toEqual([
      'classic',
      'classicann',
      'classic1x',
      'retail',
    ]);
  });

  it('offers the other game when an explicit game has no character', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.resultsByMode = { classic: null, retail: fullCharacter };

    renderProfileAt('/character/grobbulus/billiemoi?mode=classic', useCases);

    await screen.findByRole('heading', { name: 'Personaje no encontrado' });
    expect(characterRepository.modes).toEqual(['classic']);
    expect(screen.getByRole('link', { name: 'Buscar en Retail' })).toHaveAttribute(
      'href',
      '/character/grobbulus/billiemoi?mode=retail',
    );
    expect(
      screen.getByRole('link', { name: 'Buscar en TBC Aniversario' }),
    ).toHaveAttribute('href', '/character/grobbulus/billiemoi?mode=classicann');
  });

  it('shows a loading status without character data', () => {
    const { useCases } = createTestDependencies({
      getCharacter: {
        execute: () => new Promise(() => undefined),
      } as unknown as UseCases['getCharacter'],
    });

    renderProfileAt('/character/grobbulus/billiemoi', useCases);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando personaje…',
    );
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('renders every field of a full character', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.result = fullCharacter;

    renderProfileAt('/character/grobbulus/billiemoi', useCases);

    expect(
      await screen.findByRole('heading', { name: 'Billiemoi', level: 1 }),
    ).toBeInTheDocument();
    expect(detailValue('Nivel')).toBe('60');
    expect(detailValue('Raza')).toBe('Gnome');
    expect(detailValue('Clase')).toBe('Mage');
    expect(detailValue('Especialización')).toBe('Frost');
    expect(detailValue('Reino')).toBe('grobbulus');
    expect(detailValue('Nivel de objeto')).toBe('245');
    expect(detailValue('Puntos de logro')).toBe(
      new Intl.NumberFormat('es-ES').format(12345),
    );
    expect(detailValue('Última conexión')).toBe(
      new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(fullCharacter.lastLogin),
    );

    const guild = screen.getByRole('region', { name: 'Hermandad' });
    expect(within(guild).getByText('Guardians of Azeroth')).toBeInTheDocument();
    expect(within(guild).getByText('Reino: Grobbulus')).toBeInTheDocument();
    expect(within(guild).getByText('Maestro de hermandad')).toBeInTheDocument();
    expect(within(guild).getByText('42 miembros')).toBeInTheDocument();

    const achievements = screen.getByRole('region', {
      name: 'Logros recientes',
    });
    const items = within(achievements).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Level 60');
    expect(items[0]).toHaveTextContent('10 puntos');
    expect(items[0]).toHaveTextContent(
      new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(
        new Date('2026-10-01T12:00:00Z'),
      ),
    );
    expect(items[1]).toHaveTextContent('Explorer');
  });

  it('shows a non-zero guild rank as "Rango N"', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.result = {
      ...fullCharacter,
      guild: { name: 'Horde Rising', rank: 3 },
    };

    renderProfileAt('/character/grobbulus/billiemoi', useCases);

    expect(await screen.findByText('Rango 3')).toBeInTheDocument();
  });

  it('handles missing optional fields and unknown zeros', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.result = minimalCharacter;

    const { container } = renderProfileAt(
      '/character/grobbulus/newbie',
      useCases,
    );

    expect(
      await screen.findByRole('heading', { name: 'Newbie', level: 1 }),
    ).toBeInTheDocument();
    expect(detailValue('Nivel de objeto')).toBe('No disponible');
    expect(detailValue('Puntos de logro')).toBe('No disponible');
    expect(detailValue('Especialización')).toBe('No disponible');
    expect(detailValue('Última conexión')).toBe('No disponible');
    expect(screen.getByText('Sin hermandad')).toBeInTheDocument();
    expect(screen.getByText('Sin logros recientes')).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/undefined|NaN|Invalid Date/);
  });

  it('shows not-found with the search form and a home link', async () => {
    const { useCases } = createTestDependencies();

    renderProfileAt('/character/grobbulus/ghost', useCases);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No encontramos a ghost en grobbulus.',
    );
    expect(
      screen.getByRole('search', { name: 'Buscar personaje' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Volver al inicio' }),
    ).toHaveAttribute('href', '/');
  });

  it('shows invalid params without calling the repository', async () => {
    const { useCases, characterRepository } = createTestDependencies();

    renderProfileAt('/character/bad..realm/billiemoi', useCases);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no tienen un formato válido',
    );
    expect(
      screen.getByRole('search', { name: 'Buscar personaje' }),
    ).toBeInTheDocument();
    expect(characterRepository.calls).toHaveLength(0);
  });

  it('shows rate limiting with the retry seconds', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.error = new CharacterRateLimited(30);

    renderProfileAt('/character/grobbulus/billiemoi', useCases);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Demasiadas consultas. Inténtalo de nuevo en 30 segundos.',
    );
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('shows a generic rate limit message without seconds and retries', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.error = new CharacterRateLimited();

    renderProfileAt('/character/grobbulus/billiemoi', useCases);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Demasiadas consultas.');
    expect(alert).not.toHaveTextContent('segundos');

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => {
      expect(characterRepository.calls).toHaveLength(2);
    });
  });

  it('shows unavailable with a retry that calls the repository again', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.error = new CharacterUnavailable('raw server body');

    renderProfileAt('/character/grobbulus/billiemoi', useCases);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Los datos del personaje no están disponibles ahora mismo.',
    );
    expect(alert).not.toHaveTextContent('raw server body');

    characterRepository.error = undefined;
    characterRepository.result = fullCharacter;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('heading', { name: 'Billiemoi', level: 1 }),
    ).toBeInTheDocument();
    expect(characterRepository.calls).toHaveLength(2);
  });

  it('queries a capitalized name from the URL in lowercase', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.result = fullCharacter;

    renderProfileAt('/character/grobbulus/Billiemoi', useCases);

    await screen.findByRole('heading', { name: 'Billiemoi', level: 1 });
    expect(characterRepository.calls).toEqual([
      { realmSlug: 'grobbulus', characterName: 'billiemoi' },
    ]);
  });
});
