import { BlizzardMapper } from './BlizzardMapper';
import { RealmSlug } from '../domain/RealmSlug';
import { BlizzardUnavailable } from '../domain/errors/CharacterError';

const REALM = RealmSlug.create('grobbulus');

const REALISTIC_PAYLOAD = {
  name: 'Billiemoi',
  level: 60,
  character_class: { name: 'Warrior' },
  race: { name: 'Orc' },
  active_spec: { name: 'Arms' },
  equipped_item_level: 245,
  average_item_level: 250,
  achievement_points: 12345,
  last_login_timestamp: 1700000000000,
  guild: {
    name: 'Warbringers',
    realm: { name: 'Grobbulus' },
    rank: 3,
    member_count: 120,
  },
  achievements: [
    {
      id: 1234,
      name: 'Level 60',
      points: 10,
      completed_timestamp: 1700000000000,
    },
  ],
};

describe('BlizzardMapper', () => {
  const mapper = new BlizzardMapper();

  it('maps a realistic Blizzard payload into the domain aggregate', () => {
    const character = mapper.toDomain(REALISTIC_PAYLOAD, REALM);

    expect(character.name.value).toBe('Billiemoi');
    expect(character.realmSlug.value).toBe('grobbulus');
    expect(character.level).toBe(60);
    expect(character.characterClass.value).toBe('Warrior');
    expect(character.race.value).toBe('Orc');
    expect(character.specialization?.value).toBe('Arms');
    expect(character.itemLevel.value).toBe(245);
    expect(character.achievementPoints.value).toBe(12345);
    expect(character.lastLogin?.toISOString()).toBe(
      new Date(1700000000000).toISOString(),
    );
    expect(character.guild?.name).toBe('Warbringers');
    expect(character.guild?.realm).toBe('Grobbulus');
    expect(character.guild?.rank).toBe(3);
    expect(character.guild?.memberCount).toBe(120);
    expect(character.achievements).toHaveLength(1);
    expect(character.achievements?.[0]).toMatchObject({
      id: 1234,
      name: 'Level 60',
      points: 10,
    });
    expect(character.achievements?.[0].completedAt?.toISOString()).toBe(
      new Date(1700000000000).toISOString(),
    );
  });

  it('falls back to average_item_level when equipped_item_level is absent', () => {
    const character = mapper.toDomain(
      {
        name: 'Billiemoi',
        level: 60,
        character_class: { name: 'Warrior' },
        race: { name: 'Orc' },
        average_item_level: 250,
      },
      REALM,
    );

    expect(character.itemLevel.value).toBe(250);
  });

  it('tolerates absent optional fields without inventing data', () => {
    const character = mapper.toDomain(
      {
        name: 'Billiemoi',
        level: 60,
        character_class: { name: 'Warrior' },
        race: { name: 'Orc' },
      },
      REALM,
    );

    expect(character.specialization).toBeUndefined();
    expect(character.itemLevel.value).toBe(0);
    expect(character.achievementPoints.value).toBe(0);
    expect(character.lastLogin).toBeUndefined();
    expect(character.guild).toBeUndefined();
    expect(character.achievements).toBeUndefined();
  });

  it('ignores a guild payload without a name', () => {
    const character = mapper.toDomain(
      {
        name: 'Billiemoi',
        level: 60,
        character_class: { name: 'Warrior' },
        race: { name: 'Orc' },
        guild: { rank: 1, member_count: 10 },
      },
      REALM,
    );

    expect(character.guild).toBeUndefined();
  });

  it('maps nested achievement payloads when Blizzard wraps the achievement', () => {
    const character = mapper.toDomain(
      {
        name: 'Billiemoi',
        level: 60,
        character_class: { name: 'Warrior' },
        race: { name: 'Orc' },
        achievements: [
          {
            achievement: { id: 99, name: 'Nested achievement' },
            completed_at: 1700000000000,
          },
        ],
      },
      REALM,
    );

    expect(character.achievements).toHaveLength(1);
    expect(character.achievements?.[0].id).toBe(99);
    expect(character.achievements?.[0].name).toBe('Nested achievement');
  });

  it('rejects payloads missing required fields instead of inventing them', () => {
    expect(() => mapper.toDomain({}, REALM)).toThrow(BlizzardUnavailable);
    expect(() =>
      mapper.toDomain(
        { name: 'Billiemoi', level: 60, race: { name: 'Orc' } },
        REALM,
      ),
    ).toThrow(BlizzardUnavailable);
  });
});
