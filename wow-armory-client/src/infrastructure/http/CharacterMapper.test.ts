import { describe, expect, it } from 'vitest';
import type { CharacterDto } from './CharacterDto';
import { CharacterMapper } from './CharacterMapper';

const fullDto: CharacterDto = {
  name: 'Billiemoi',
  realmSlug: 'grobbulus',
  level: 60,
  class: 'Warrior',
  race: 'Orc',
  spec: 'Arms',
  itemLevel: 245,
  achievementPoints: 12345,
  lastLogin: '2023-11-14T22:13:20.000Z',
  guild: {
    name: 'Warbringers',
    realm: 'Grobbulus',
    rank: 3,
    memberCount: 120,
  },
  achievements: [
    {
      id: 1234,
      name: 'Level 60',
      points: 10,
      completedAt: '2023-11-14T22:13:20.000Z',
    },
  ],
};

describe('CharacterMapper', () => {
  it('maps a complete DTO to the domain model', () => {
    const character = CharacterMapper.toDomain(fullDto);

    expect(character).toEqual({
      name: 'Billiemoi',
      realmSlug: 'grobbulus',
      level: 60,
      characterClass: 'Warrior',
      race: 'Orc',
      specialization: 'Arms',
      itemLevel: 245,
      achievementPoints: 12345,
      lastLogin: new Date('2023-11-14T22:13:20.000Z'),
      guild: {
        name: 'Warbringers',
        realm: 'Grobbulus',
        rank: 3,
        memberCount: 120,
      },
      achievements: [
        {
          id: 1234,
          name: 'Level 60',
          points: 10,
          completedAt: new Date('2023-11-14T22:13:20.000Z'),
        },
      ],
    });
  });

  it('leaves optional fields undefined when absent', () => {
    const character = CharacterMapper.toDomain({
      name: 'Billiemoi',
      realmSlug: 'grobbulus',
      level: 60,
      class: 'Warrior',
      race: 'Orc',
      itemLevel: 245,
      achievementPoints: 0,
    });

    expect(character.specialization).toBeUndefined();
    expect(character.lastLogin).toBeUndefined();
    expect(character.guild).toBeUndefined();
    expect(character.achievements).toBeUndefined();
  });

  it('keeps ranks numeric and tolerates invalid ISO dates', () => {
    const character = CharacterMapper.toDomain({
      ...fullDto,
      lastLogin: 'not-a-date',
      guild: { name: 'Warbringers', rank: 7 },
      achievements: [
        { name: 'No date', points: 0, completedAt: 'not-a-date' },
      ],
    });

    expect(character.guild?.rank).toBe(7);
    expect(character.guild?.realm).toBeUndefined();
    expect(character.guild?.memberCount).toBeUndefined();
    expect(character.lastLogin).toBeUndefined();
    expect(character.achievements?.[0].completedAt).toBeUndefined();
  });
});
