import axios from 'axios';
import { BlizzardResourceNotFound } from '../characters/domain/errors/CharacterError';
import {
  createTestBlizzardClient,
  mockBlizzardRoutes,
} from '../shared/infrastructure/blizzard/testing';
import { BlizzardGuildAdapter } from './BlizzardGuildAdapter';

const BASE = '/data/wow/guild/grobbulus/the-horde';

describe('BlizzardGuildAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('combines summary, crest, roster, activity and achievements', async () => {
    const get = mockBlizzardRoutes(axios, {
      [BASE]: {
        name: 'The Horde',
        faction: { type: 'HORDE' },
        member_count: 2,
        achievement_points: 500,
        realm: { name: 'Grobbulus', slug: 'grobbulus' },
        created_timestamp: 1_600_000_000_000,
        crest: {
          emblem: { id: 1, color: { rgba: { r: 255, g: 0, b: 0, a: 1 } } },
          border: { id: 2, color: { rgba: { r: 0, g: 0, b: 0, a: 1 } } },
          background: { color: { rgba: { r: 10, g: 20, b: 30, a: 1 } } },
        },
      },
      [`${BASE}/roster`]: {
        members: [
          {
            character: { name: 'Zed', level: 50, playable_class: { id: 4 } },
            rank: 1,
          },
          {
            character: {
              name: 'Billiemoi',
              level: 60,
              realm: { slug: 'grobbulus' },
            },
            rank: 0,
          },
        ],
      },
      [`${BASE}/activity`]: {
        activities: [
          {
            character_achievement: {
              character: { name: 'Zed' },
              achievement: { name: 'Level 50' },
            },
            activity: { type: 'CHARACTER_ACHIEVEMENT' },
            timestamp: 1_700_000_000_000,
          },
        ],
      },
      '/data/wow/media/guild-crest/emblem/1': {
        assets: [{ key: 'image', value: 'emblem.png' }],
      },
    });

    const guild = await new BlizzardGuildAdapter(
      createTestBlizzardClient('us'),
    ).getGuild('grobbulus', 'the-horde', 'classic');

    expect(guild).toMatchObject({
      name: 'The Horde',
      faction: 'HORDE',
      memberCount: 2,
      realmSlug: 'grobbulus',
      createdAt: new Date(1_600_000_000_000).toISOString(),
      crest: {
        emblemUrl: 'emblem.png',
        borderUrl: undefined,
        emblemColor: 'rgba(255, 0, 0, 1)',
        backgroundColor: 'rgba(10, 20, 30, 1)',
      },
      recentAchievements: [],
    });
    expect(guild.members.map((m) => m.name)).toEqual(['Billiemoi', 'Zed']);
    expect(guild.activity[0]).toMatchObject({
      type: 'CHARACTER_ACHIEVEMENT',
      characterName: 'Zed',
      achievementName: 'Level 50',
    });
    expect(get.mock.calls[0][1]).toMatchObject({
      params: { namespace: 'profile-classic-us' },
    });
  });

  it('propagates a missing guild as BlizzardResourceNotFound', async () => {
    mockBlizzardRoutes(axios, {});

    await expect(
      new BlizzardGuildAdapter(createTestBlizzardClient()).getGuild(
        'grobbulus',
        'nope',
        'classic',
      ),
    ).rejects.toBeInstanceOf(BlizzardResourceNotFound);
  });
});
