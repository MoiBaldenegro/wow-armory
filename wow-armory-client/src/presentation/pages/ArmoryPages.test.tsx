import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { GetCharacterDetails } from '../../application/character/GetCharacterDetails';
import type { Character } from '../../domain/character/Character';
import type { CharacterDetails } from '../../domain/character/CharacterDetails';
import type { UseCases } from '../../infrastructure/container';
import {
  createTestDependencies,
  InMemoryArmoryRepository,
  withArmory,
} from '../../test/fakes';
import { AuthProvider } from '../providers/AuthProvider';
import { UseCasesProvider } from '../providers/UseCasesProvider';
import { AppRoutes } from '../router/AppRouter';

const hunter: Character = {
  name: 'Billiemoi',
  realmSlug: 'grobbulus',
  level: 60,
  characterClass: 'Hunter',
  race: 'Orc',
  itemLevel: 66,
  achievementPoints: 100,
  faction: 'HORDE',
  guild: { name: 'The Horde', realm: 'Grobbulus', realmSlug: 'grobbulus' },
};

const details: CharacterDetails = {
  renderUrl: 'https://render.example/main-raw.png',
  media: [{ key: 'main-raw', url: 'https://render.example/main-raw.png' }],
  equipment: [
    {
      slot: 'Head',
      name: 'Beaststalker Cap',
      itemId: 16677,
      level: 61,
      qualityType: 'RARE',
      binding: 'Binds when picked up',
      stats: [{ text: '+20 Agility' }],
      enchantments: ['Lesser Arcanum of Voracity'],
      set: {
        name: 'Beaststalker Armor',
        items: [{ name: 'Beaststalker Cap', equipped: true }],
        effects: [{ text: '(2) Set: +40 Attack Power', active: false }],
      },
    },
  ],
};

function renderAt(path: string, useCases: UseCases) {
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

function setup(configure: (repository: InMemoryArmoryRepository) => void = () => {}) {
  const armory = new InMemoryArmoryRepository();
  configure(armory);
  const dependencies = createTestDependencies({
    ...withArmory(armory),
    getCharacterDetails: new GetCharacterDetails({
      getDetails: async () => details,
    }),
  });
  dependencies.characterRepository.result = hunter;
  return { ...dependencies, armory };
}

describe('Character page integrations', () => {
  it('shows the render, stats, talents, PvP, pets and the guild link', async () => {
    const { useCases } = setup((armory) => {
      armory.statistics = {
        powerType: 'Mana',
        stats: [
          { key: 'health', group: 'general', value: 4200, kind: 'number' },
          { key: 'power', group: 'general', value: 3000, kind: 'number' },
          { key: 'rangedCrit', group: 'offense', value: 12.5, kind: 'percent' },
        ],
      };
      armory.talents = {
        groups: [
          {
            active: true,
            trees: [
              { name: 'Marksmanship', points: 31, talents: [{ name: 'Trueshot Aura', rank: 1 }] },
            ],
          },
        ],
      };
      armory.pvp = {
        honorableKills: 1500,
        brackets: [{ bracket: '2v2', rating: 1700, season: { played: 4, won: 3, lost: 1 } }],
      };
      armory.pets = [{ name: 'Misha', level: 60, creature: 'Bear', active: true, summoned: true }];
    });

    renderAt('/character/grobbulus/billiemoi', useCases);

    expect(await screen.findByRole('img', { name: 'Render de Billiemoi' })).toHaveAttribute(
      'src',
      details.renderUrl,
    );

    const stats = await screen.findByRole('region', { name: 'Estadísticas' });
    expect(within(stats).getByText('Salud')).toBeInTheDocument();
    expect(within(stats).getByText('Mana')).toBeInTheDocument();
    expect(within(stats).getByText('12.5 %')).toBeInTheDocument();

    const talents = await screen.findByRole('region', { name: 'Talentos' });
    expect(within(talents).getByText('Trueshot Aura')).toBeInTheDocument();
    expect(within(talents).getByText('31 pts')).toBeInTheDocument();

    const pvp = await screen.findByRole('region', { name: 'JcJ' });
    expect(within(pvp).getByText('Arena 2c2')).toBeInTheDocument();
    expect(within(pvp).getByText('75 %')).toBeInTheDocument();

    const pets = await screen.findByRole('region', { name: 'Mascotas de cazador' });
    expect(within(pets).getByText('Misha')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'The Horde' })).toHaveAttribute(
      'href',
      '/guild/grobbulus/the-horde?mode=classic',
    );
    expect(screen.getByText('Horda')).toBeInTheDocument();
  });

  it('expands an item tooltip with its auction price', async () => {
    const user = userEvent.setup();
    const { useCases, armory } = setup((repository) => {
      repository.prices = {
        realmSlug: 'grobbulus',
        auctionHouse: 'Horde Auction House',
        prices: { '16677': { minBuyout: 123456, quantity: 2 } },
      };
    });

    renderAt('/character/grobbulus/billiemoi', useCases);

    const toggle = await screen.findByRole('button', { name: /Beaststalker Cap/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(toggle).toHaveTextContent('12o 34p 56c'));

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('+20 Agility')).toBeInTheDocument();
    expect(screen.getByText('Lesser Arcanum of Voracity')).toBeInTheDocument();
    expect(screen.getByText('(2) Set: +40 Attack Power')).toBeInTheDocument();
    expect(screen.getByText(/Subasta \(Horde Auction House\)/)).toBeInTheDocument();
    expect(armory.calls).toContain('auctions:classic:grobbulus:horde:16677');
  });

  it('hides sections without data and does not ask pets for other classes', async () => {
    const { useCases, characterRepository, armory } = setup();
    characterRepository.result = { ...hunter, characterClass: 'Warrior' };

    renderAt('/character/grobbulus/billiemoi', useCases);

    await screen.findByRole('heading', { name: 'Billiemoi' });
    await waitFor(() => expect(armory.calls.some((c) => c.startsWith('pvp:'))).toBe(true));
    expect(screen.queryByRole('region', { name: 'Estadísticas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'JcJ' })).not.toBeInTheDocument();
    expect(armory.calls.some((call) => call.startsWith('pets:'))).toBe(false);
  });
});

describe('GuildPage', () => {
  it('shows the guild, filters the roster and links members', async () => {
    const user = userEvent.setup();
    const { useCases, armory } = setup((repository) => {
      repository.guild = {
        name: 'The Horde',
        slug: 'the-horde',
        realmName: 'Grobbulus',
        realmSlug: 'grobbulus',
        faction: 'HORDE',
        memberCount: 2,
        achievementPoints: 500,
        members: [
          { name: 'Billiemoi', level: 60, classId: 3, rank: 0 },
          { name: 'Zed', level: 50, classId: 4, rank: 1 },
        ],
        activity: [
          { type: 'CHARACTER_ACHIEVEMENT', characterName: 'Zed', achievementName: 'Level 50' },
        ],
        recentAchievements: [{ name: 'Guild Level 10' }],
      };
    });

    renderAt('/guild/grobbulus/the-horde?mode=classic', useCases);

    expect(await screen.findByRole('heading', { name: 'The Horde', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Escudo de The Horde' })).toBeInTheDocument();
    expect(screen.getByText('Zed consiguió «Level 50»')).toBeInTheDocument();
    expect(screen.getByText('Guild Level 10')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Billiemoi' })).toHaveAttribute(
      'href',
      '/character/grobbulus/billiemoi?mode=classic',
    );
    expect(screen.getByText('Maestro de hermandad')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Filtrar por nombre o clase'), 'pícaro');

    expect(screen.queryByRole('link', { name: 'Billiemoi' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zed' })).toBeInTheDocument();
    expect(armory.calls).toContain('guild:classic:grobbulus:the-horde');
  });

  it('shows a not found card for an unknown guild', async () => {
    const { useCases } = setup();

    renderAt('/guild/grobbulus/missing', useCases);

    expect(
      await screen.findByRole('heading', { name: 'Hermandad no encontrada' }),
    ).toBeInTheDocument();
  });
});

describe('LeaderboardsPage', () => {
  it('lists entries and switches bracket', async () => {
    const user = userEvent.setup();
    const { useCases, armory } = setup((repository) => {
      repository.leaderboard = {
        bracket: '3v3',
        seasonId: 7,
        pvpRegionId: 1,
        pvpRegions: [1],
        entries: [
          { rank: 1, rating: 2600, name: 'Top', realmSlug: 'faerlina', faction: 'HORDE', won: 30, lost: 10 },
        ],
      };
    });

    renderAt('/leaderboards', useCases);

    const table = await screen.findByRole('table', { name: 'Clasificación Arena 3c3' });
    expect(within(table).getByRole('link', { name: 'Top' })).toHaveAttribute(
      'href',
      '/character/faerlina/top?mode=classic',
    );
    expect(within(table).getByText('75 %')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Temporada 7/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Arena 2c2' }));

    await waitFor(() => expect(armory.calls).toContain('leaderboard:classic:2v2:'));
    expect(screen.getByRole('button', { name: 'Arena 2c2' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Realm autocomplete', () => {
  it('suggests realms and navigates with the exact slug', async () => {
    const user = userEvent.setup();
    const { useCases } = setup((repository) => {
      repository.realms = [{ name: "Shen'dralar", slug: 'shendralar-x' }];
    });

    renderAt('/', useCases);

    const realm = (await screen.findAllByLabelText('Reino'))[0];
    await waitFor(() => expect(realm).toHaveAttribute('list'));
    const listId = realm.getAttribute('list') ?? '';
    expect(document.getElementById(listId)?.querySelector('option')).toHaveAttribute(
      'value',
      "Shen'dralar",
    );

    await user.clear(realm);
    await user.type(realm, "Shen'dralar");
    const form = realm.closest('form') as HTMLFormElement;
    const name = within(form).getByLabelText('Nombre');
    await user.clear(name);
    await user.type(name, 'Billiemoi');
    await user.click(within(form).getByRole('button', { name: /Buscar/ }));

    expect(
      await screen.findByRole('heading', { name: 'Billiemoi' }),
    ).toBeInTheDocument();
  });
});
