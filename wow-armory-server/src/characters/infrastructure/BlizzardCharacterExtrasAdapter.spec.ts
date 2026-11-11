import axios from 'axios';
import { CharacterNotFound } from '../domain/errors/CharacterError';
import {
  createTestBlizzardClient,
  mockBlizzardRoutes,
} from '../../shared/infrastructure/blizzard/testing';
import { BlizzardCharacterExtrasAdapter } from './BlizzardCharacterExtrasAdapter';

const BASE = '/profile/wow/character/grobbulus/billiemoi';

function adapter() {
  return new BlizzardCharacterExtrasAdapter(createTestBlizzardClient('us'));
}

describe('BlizzardCharacterExtrasAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('maps statistics from effective, value and plain numbers', async () => {
    mockBlizzardRoutes(axios, {
      [`${BASE}/statistics`]: {
        health: 5000,
        power: 3000,
        power_type: { name: 'Mana' },
        strength: { base: 50, effective: 120 },
        spirit: { base: 80, effective: 90 },
        melee_crit: { rating: 10, value: 12.5 },
        armor: { base: 900, effective: 1100 },
        fire_resistance: { base: 0, effective: 15 },
        unknown_field: 3,
      },
    });

    const result = await adapter().getStatistics(
      'grobbulus',
      'Billiemoi',
      'classic',
    );

    expect(result.powerType).toBe('Mana');
    expect(result.stats).toEqual(
      expect.arrayContaining([
        { key: 'health', group: 'general', value: 5000, kind: 'number' },
        { key: 'strength', group: 'attributes', value: 120, kind: 'number' },
        { key: 'meleeCrit', group: 'offense', value: 12.5, kind: 'percent' },
        { key: 'armor', group: 'defense', value: 1100, kind: 'number' },
        {
          key: 'fireResistance',
          group: 'resistances',
          value: 15,
          kind: 'number',
        },
      ]),
    );
    expect(result.stats.find((s) => s.key === 'unknown_field')).toBeUndefined();
  });

  it('maps Classic talent trees', async () => {
    mockBlizzardRoutes(axios, {
      [`${BASE}/specializations`]: {
        specialization_groups: [
          {
            is_active: true,
            specializations: [
              {
                specialization_name: 'Arms',
                spent_points: 31,
                talents: [
                  {
                    talent: { name: 'Deflection' },
                    spell_tooltip: { description: 'Parry +5%' },
                    talent_rank: 5,
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await adapter().getTalents(
      'grobbulus',
      'billiemoi',
      'classic',
    );

    expect(result.groups).toEqual([
      {
        active: true,
        trees: [
          {
            name: 'Arms',
            points: 31,
            talents: [
              { name: 'Deflection', rank: 5, description: 'Parry +5%' },
            ],
          },
        ],
      },
    ]);
  });

  it('maps Retail loadouts and marks the active specialization', async () => {
    mockBlizzardRoutes(axios, {
      [`${BASE}/specializations`]: {
        active_specialization: { name: 'Fury' },
        specializations: [
          {
            specialization: { name: 'Fury' },
            loadouts: [
              {
                is_active: true,
                selected_class_talents: [
                  {
                    rank: 1,
                    tooltip: { talent: { name: 'Charge' }, spell_tooltip: {} },
                  },
                ],
                selected_spec_talents: [],
              },
            ],
          },
        ],
      },
    });

    const result = await adapter().getTalents(
      'grobbulus',
      'billiemoi',
      'retail',
    );

    expect(result.activeSpecialization).toBe('Fury');
    expect(result.groups[0]).toEqual({
      name: 'Fury',
      active: true,
      trees: [{ name: 'class', talents: [{ name: 'Charge', rank: 1 }] }],
    });
  });

  it('loads every PvP bracket listed in the summary', async () => {
    mockBlizzardRoutes(axios, {
      [`${BASE}/pvp-summary`]: {
        honorable_kills: 1234,
        brackets: [
          {
            href: `https://us.api.blizzard.com${BASE}/pvp-bracket/2v2?namespace=x`,
          },
          {
            href: `https://us.api.blizzard.com${BASE}/pvp-bracket/3v3?namespace=x`,
          },
        ],
      },
      [`${BASE}/pvp-bracket/2v2`]: {
        rating: 1850,
        season_match_statistics: { played: 30, won: 20, lost: 10 },
      },
    });

    const result = await adapter().getPvp('grobbulus', 'billiemoi', 'classic');

    expect(result).toEqual({
      honorableKills: 1234,
      honorLevel: undefined,
      brackets: [
        {
          bracket: '2v2',
          rating: 1850,
          season: { played: 30, won: 20, lost: 10 },
          weekly: undefined,
        },
      ],
    });
  });

  it('returns hunter pets with images and [] for non hunters', async () => {
    mockBlizzardRoutes(axios, {
      [`${BASE}/hunter-pets`]: {
        hunter_pets: [
          {
            name: 'Misha',
            level: 60,
            creature: { name: 'Bear' },
            creature_display: { id: 77 },
            is_active: true,
          },
        ],
      },
      '/data/wow/media/creature-display/77': {
        assets: [{ key: 'zoom', value: 'misha.jpg' }],
      },
    });

    await expect(
      adapter().getHunterPets('grobbulus', 'billiemoi', 'classic'),
    ).resolves.toEqual([
      {
        name: 'Misha',
        level: 60,
        creature: 'Bear',
        active: true,
        summoned: false,
        slot: undefined,
        imageUrl: 'misha.jpg',
      },
    ]);
    await expect(
      adapter().getHunterPets('grobbulus', 'warrior', 'classic'),
    ).resolves.toEqual([]);
  });

  it('maps a missing character to CharacterNotFound', async () => {
    mockBlizzardRoutes(axios, {});

    await expect(
      adapter().getStatistics('grobbulus', 'nobody', 'classic'),
    ).rejects.toBeInstanceOf(CharacterNotFound);
  });
});
