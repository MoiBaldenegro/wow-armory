import {
  BlizzardResourceNotFound,
  CharacterNotFound,
} from '../domain/errors/CharacterError';
import {
  BlizzardApiClient,
  CACHE_TTL,
  pickAsset,
} from '../../shared/infrastructure/blizzard/blizzard-api-client';
import {
  toBlizzardPathSegment,
  WowMode,
} from '../../shared/infrastructure/blizzard/blizzard-api-config';
import {
  asArray,
  asBoolean,
  asNumber,
  asRecord,
  asString,
  hrefTail,
  RawRecord,
} from '../../shared/infrastructure/blizzard/raw';

export type StatGroup =
  | 'general'
  | 'attributes'
  | 'offense'
  | 'defense'
  | 'resistances';

export interface CharacterStatValue {
  key: string;
  group: StatGroup;
  value: number;
  kind: 'number' | 'percent';
}

export interface CharacterStatistics {
  powerType?: string;
  stats: CharacterStatValue[];
}

export interface TalentEntry {
  name: string;
  rank?: number;
  description?: string;
}

export interface TalentTree {
  name: string;
  points?: number;
  talents: TalentEntry[];
}

export interface TalentGroup {
  name?: string;
  active: boolean;
  trees: TalentTree[];
}

export interface CharacterTalents {
  activeSpecialization?: string;
  groups: TalentGroup[];
}

export interface PvpMatchStats {
  played: number;
  won: number;
  lost: number;
}

export interface PvpBracket {
  bracket: string;
  rating?: number;
  season?: PvpMatchStats;
  weekly?: PvpMatchStats;
}

export interface CharacterPvp {
  honorableKills?: number;
  honorLevel?: number;
  brackets: PvpBracket[];
}

export interface HunterPet {
  name: string;
  level?: number;
  creature?: string;
  active: boolean;
  summoned: boolean;
  slot?: number;
  imageUrl?: string;
}

/** key in the payload → key in our contract, group and kind. */
const STAT_FIELDS: Array<[string, string, StatGroup, 'number' | 'percent']> = [
  ['health', 'health', 'general', 'number'],
  ['power', 'power', 'general', 'number'],
  ['strength', 'strength', 'attributes', 'number'],
  ['agility', 'agility', 'attributes', 'number'],
  ['stamina', 'stamina', 'attributes', 'number'],
  ['intellect', 'intellect', 'attributes', 'number'],
  ['spirit', 'spirit', 'attributes', 'number'],
  ['attack_power', 'attackPower', 'offense', 'number'],
  ['melee_crit', 'meleeCrit', 'offense', 'percent'],
  ['melee_haste', 'meleeHaste', 'offense', 'percent'],
  ['ranged_crit', 'rangedCrit', 'offense', 'percent'],
  ['ranged_haste', 'rangedHaste', 'offense', 'percent'],
  ['spell_power', 'spellPower', 'offense', 'number'],
  ['spell_crit', 'spellCrit', 'offense', 'percent'],
  ['spell_haste', 'spellHaste', 'offense', 'percent'],
  ['mastery', 'mastery', 'offense', 'percent'],
  ['versatility_damage_done_bonus', 'versatility', 'offense', 'percent'],
  ['mana_regen', 'manaRegen', 'offense', 'number'],
  ['armor', 'armor', 'defense', 'number'],
  ['defense', 'defense', 'defense', 'number'],
  ['dodge', 'dodge', 'defense', 'percent'],
  ['parry', 'parry', 'defense', 'percent'],
  ['block', 'block', 'defense', 'percent'],
  ['fire_resistance', 'fireResistance', 'resistances', 'number'],
  ['frost_resistance', 'frostResistance', 'resistances', 'number'],
  ['nature_resistance', 'natureResistance', 'resistances', 'number'],
  ['shadow_resistance', 'shadowResistance', 'resistances', 'number'],
  ['arcane_resistance', 'arcaneResistance', 'resistances', 'number'],
];

const MAX_PVP_BRACKETS = 6;

/** `{ effective }`, `{ value }` or a plain number. */
function statValue(value: unknown): number | undefined {
  const record = asRecord(value);
  return (
    asNumber(value) ?? asNumber(record?.effective) ?? asNumber(record?.value)
  );
}

function matchStats(value: unknown): PvpMatchStats | undefined {
  const record = asRecord(value);
  const played = asNumber(record?.played);
  return record && played !== undefined
    ? {
        played,
        won: asNumber(record.won) ?? 0,
        lost: asNumber(record.lost) ?? 0,
      }
    : undefined;
}

function talentFromTooltip(value: unknown): TalentEntry | undefined {
  const record = asRecord(value);
  const tooltip = asRecord(record?.tooltip) ?? record;
  const spellTooltip = asRecord(tooltip?.spell_tooltip);
  const name =
    asString(asRecord(tooltip?.talent)?.name) ??
    asString(asRecord(spellTooltip?.spell)?.name);

  return name
    ? {
        name,
        rank: asNumber(record?.rank) ?? asNumber(record?.talent_rank),
        description: asString(spellTooltip?.description),
      }
    : undefined;
}

export class BlizzardCharacterExtrasAdapter {
  constructor(private readonly client: BlizzardApiClient) {}

  async getStatistics(
    realm: string,
    name: string,
    mode: WowMode,
  ): Promise<CharacterStatistics> {
    const data = asRecord(
      await this.getProfile(realm, name, mode, '/statistics'),
    );

    return {
      powerType: asString(asRecord(data?.power_type)?.name),
      stats: STAT_FIELDS.flatMap(([source, key, group, kind]) => {
        const value = statValue(data?.[source]);
        return value === undefined ? [] : [{ key, group, value, kind }];
      }),
    };
  }

  async getTalents(
    realm: string,
    name: string,
    mode: WowMode,
  ): Promise<CharacterTalents> {
    const data = asRecord(
      await this.getProfile(realm, name, mode, '/specializations'),
    );

    // Classic progression: specialization_groups[].specializations[] trees.
    const classicGroups = asArray(data?.specialization_groups);
    if (classicGroups.length > 0) {
      return {
        groups: classicGroups.map((value) => {
          const group = asRecord(value);
          return {
            active: asBoolean(group?.is_active) ?? false,
            trees: asArray(group?.specializations).map((tree) => {
              const record = asRecord(tree);
              return {
                name:
                  asString(record?.specialization_name) ??
                  asString(asRecord(record?.specialization)?.name) ??
                  '—',
                points: asNumber(record?.spent_points),
                talents: asArray(record?.talents)
                  .map(talentFromTooltip)
                  .filter((t): t is TalentEntry => t !== undefined),
              };
            }),
          };
        }),
      };
    }

    // Retail: specializations[] with loadouts of class and spec talents.
    const active = asString(asRecord(data?.active_specialization)?.name);
    return {
      activeSpecialization: active,
      groups: asArray(data?.specializations).map((value) => {
        const spec = asRecord(value);
        const specName = asString(asRecord(spec?.specialization)?.name);
        const loadouts = asArray(spec?.loadouts).map(asRecord);
        const loadout =
          loadouts.find((item) => asBoolean(item?.is_active)) ?? loadouts[0];
        const toTalents = (list: unknown) =>
          asArray(list)
            .map(talentFromTooltip)
            .filter((t): t is TalentEntry => t !== undefined);

        return {
          name: specName,
          active: specName !== undefined && specName === active,
          trees: [
            {
              name: 'class',
              talents: toTalents(loadout?.selected_class_talents),
            },
            {
              name: specName ?? 'spec',
              talents: toTalents(loadout?.selected_spec_talents),
            },
            ...(asArray(loadout?.selected_hero_talents).length
              ? [
                  {
                    name: 'hero',
                    talents: toTalents(loadout?.selected_hero_talents),
                  },
                ]
              : []),
          ].filter((tree) => tree.talents.length > 0),
        };
      }),
    };
  }

  async getPvp(
    realm: string,
    name: string,
    mode: WowMode,
  ): Promise<CharacterPvp> {
    const summary = asRecord(
      await this.getProfile(realm, name, mode, '/pvp-summary'),
    );
    const bracketKeys = asArray(summary?.brackets)
      .map((value) => hrefTail(asRecord(value)?.href))
      .filter((key): key is string => key !== undefined)
      .slice(0, MAX_PVP_BRACKETS);

    const brackets = await Promise.all(
      bracketKeys.map(async (bracket): Promise<PvpBracket | undefined> => {
        try {
          const data = asRecord(
            await this.getProfile(
              realm,
              name,
              mode,
              `/pvp-bracket/${encodeURIComponent(bracket)}`,
            ),
          );
          return {
            bracket,
            rating: asNumber(data?.rating),
            season: matchStats(data?.season_match_statistics),
            weekly: matchStats(data?.weekly_match_statistics),
          };
        } catch {
          return undefined;
        }
      }),
    );

    return {
      honorableKills: asNumber(summary?.honorable_kills),
      honorLevel: asNumber(summary?.honor_level),
      brackets: brackets.filter((b): b is PvpBracket => b !== undefined),
    };
  }

  /** Non hunters answer 404; that is mapped to an empty list. */
  async getHunterPets(
    realm: string,
    name: string,
    mode: WowMode,
  ): Promise<HunterPet[]> {
    let data: RawRecord | undefined;

    try {
      data = asRecord(await this.getProfile(realm, name, mode, '/hunter-pets'));
    } catch (error) {
      if (error instanceof CharacterNotFound) {
        return [];
      }
      throw error;
    }

    const pets = asArray(data?.hunter_pets).map(asRecord);

    return Promise.all(
      pets.flatMap((pet) => {
        const petName = asString(pet?.name);
        if (!pet || !petName) {
          return [];
        }

        return [
          (async (): Promise<HunterPet> => ({
            name: petName,
            level: asNumber(pet.level),
            creature: asString(asRecord(pet.creature)?.name),
            active: asBoolean(pet.is_active) ?? false,
            summoned: asBoolean(pet.is_summoned) ?? false,
            slot: asNumber(pet.slot),
            imageUrl: await this.getCreatureImage(
              asNumber(asRecord(pet.creature_display)?.id),
              mode,
            ),
          }))(),
        ];
      }),
    );
  }

  private async getCreatureImage(
    displayId: number | undefined,
    mode: WowMode,
  ): Promise<string | undefined> {
    if (displayId === undefined) {
      return undefined;
    }

    try {
      return pickAsset(
        await this.client.get<unknown>(
          `/data/wow/media/creature-display/${displayId}`,
          { mode, namespace: 'static', ttlMs: CACHE_TTL.media },
        ),
        ['zoom'],
      );
    } catch {
      return undefined;
    }
  }

  private async getProfile(
    realm: string,
    name: string,
    mode: WowMode,
    suffix: string,
  ): Promise<unknown> {
    try {
      return await this.client.get<unknown>(
        `/profile/wow/character/${toBlizzardPathSegment(realm)}/${toBlizzardPathSegment(name)}${suffix}`,
        { mode, namespace: 'profile', ttlMs: CACHE_TTL.profile },
      );
    } catch (error) {
      if (error instanceof BlizzardResourceNotFound) {
        throw new CharacterNotFound();
      }
      throw error;
    }
  }
}
