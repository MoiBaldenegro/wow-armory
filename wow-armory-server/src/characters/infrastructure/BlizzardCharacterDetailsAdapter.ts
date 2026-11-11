import {
  BlizzardRateLimited,
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
  displayString,
} from '../../shared/infrastructure/blizzard/raw';

export interface CharacterMediaAsset {
  key: string;
  url: string;
}

export interface ItemStatLine {
  text: string;
  /** Blizzard display color, e.g. `{ r, g, b, a }` mapped to a CSS string. */
  color?: string;
  /** Stat granted only under conditions (e.g. not usable by the class). */
  negated?: boolean;
}

export interface ItemSetInfo {
  name: string;
  items: Array<{ name: string; equipped: boolean }>;
  effects: Array<{ text: string; active: boolean }>;
}

export interface CharacterEquipmentItem {
  slot: string;
  slotType?: string;
  name: string;
  itemId?: number;
  level?: number;
  quality?: string;
  qualityType?: string;
  iconUrl?: string;
  binding?: string;
  itemType?: string;
  inventoryType?: string;
  armor?: string;
  weapon?: { damage?: string; speed?: string; dps?: string };
  stats: ItemStatLine[];
  enchantments: string[];
  sockets: string[];
  spells: string[];
  set?: ItemSetInfo;
  requirements: string[];
  durability?: string;
  description?: string;
}

export interface CharacterDetails {
  /** Preferred render for the hero (full body when available). */
  renderUrl?: string;
  media: CharacterMediaAsset[];
  equipment: CharacterEquipmentItem[];
}

const RENDER_PREFERENCE = ['main-raw', 'main', 'inset', 'avatar'];

function cssColor(value: unknown): string | undefined {
  const color = asRecord(value);
  const r = asNumber(color?.r);
  const g = asNumber(color?.g);
  const b = asNumber(color?.b);
  const a = asNumber(color?.a) ?? 1;

  return r === undefined || g === undefined || b === undefined
    ? undefined
    : `rgba(${r}, ${g}, ${b}, ${a})`;
}

export class BlizzardCharacterDetailsAdapter {
  constructor(private readonly client: BlizzardApiClient) {}

  /**
   * Loads character media and equipment. A character without media or
   * equipment (common on Classic) degrades to empty lists; only a missing
   * character, a rate limit or an upstream outage surface as errors.
   */
  async getDetails(
    realmSlug: string,
    characterName: string,
    mode: WowMode,
  ): Promise<CharacterDetails> {
    const basePath = `/profile/wow/character/${toBlizzardPathSegment(realmSlug)}/${toBlizzardPathSegment(characterName)}`;
    const options = {
      mode,
      namespace: 'profile' as const,
      ttlMs: CACHE_TTL.profile,
    };
    const [media, equipment] = await Promise.allSettled([
      this.client.get<unknown>(`${basePath}/character-media`, options),
      this.client.get<unknown>(`${basePath}/equipment`, options),
    ]);

    if (media.status === 'rejected' && equipment.status === 'rejected') {
      throw equipment.reason instanceof BlizzardResourceNotFound
        ? new CharacterNotFound()
        : equipment.reason;
    }

    for (const result of [media, equipment]) {
      if (
        result.status === 'rejected' &&
        result.reason instanceof BlizzardRateLimited
      ) {
        throw result.reason;
      }
    }

    const mediaAssets =
      media.status === 'fulfilled' ? this.mapMedia(media.value) : [];

    return {
      renderUrl: RENDER_PREFERENCE.map(
        (key) => mediaAssets.find((asset) => asset.key === key)?.url,
      ).find((url) => url !== undefined),
      media: mediaAssets,
      equipment:
        equipment.status === 'fulfilled'
          ? await this.mapEquipment(equipment.value)
          : [],
    };
  }

  private mapMedia(payload: unknown): CharacterMediaAsset[] {
    return asArray(asRecord(payload)?.assets).flatMap((asset) => {
      const item = asRecord(asset);
      const key = asString(item?.key);
      const url = asString(item?.value);

      return key && url ? [{ key, url }] : [];
    });
  }

  private async mapEquipment(
    payload: unknown,
  ): Promise<CharacterEquipmentItem[]> {
    const items = asArray(asRecord(payload)?.equipped_items);
    const mapped = await Promise.all(
      items.map(async (value) => this.mapItem(asRecord(value))),
    );

    return mapped.filter(
      (item): item is CharacterEquipmentItem => item !== undefined,
    );
  }

  private async mapItem(
    item: Record<string, unknown> | undefined,
  ): Promise<CharacterEquipmentItem | undefined> {
    const slot = asString(asRecord(item?.slot)?.name);
    const name = asString(item?.name);

    if (!item || !slot || !name) {
      return undefined;
    }

    const weapon = asRecord(item.weapon);
    const set = this.mapSet(asRecord(item.set));
    const requirements = asRecord(item.requirements);

    return {
      slot,
      slotType: asString(asRecord(item.slot)?.type),
      name,
      itemId: asNumber(asRecord(item.item)?.id),
      level: asNumber(asRecord(item.level)?.value),
      quality: asString(asRecord(item.quality)?.name),
      qualityType: asString(asRecord(item.quality)?.type),
      iconUrl: await this.getIcon(item),
      binding: displayString(item.binding),
      itemType: asString(asRecord(item.item_subclass)?.name),
      inventoryType: asString(asRecord(item.inventory_type)?.name),
      armor: displayString(item.armor),
      weapon: weapon
        ? {
            damage: displayString(weapon.damage),
            speed: displayString(weapon.attack_speed),
            dps: displayString(weapon.dps),
          }
        : undefined,
      stats: asArray(item.stats).flatMap((value) => {
        const stat = asRecord(value);
        const text = displayString(stat);

        return text
          ? [
              {
                text,
                color: cssColor(asRecord(stat?.display)?.color),
                negated: asBoolean(stat?.is_negated) || undefined,
              },
            ]
          : [];
      }),
      enchantments: asArray(item.enchantments)
        .map((value) => displayString(value))
        .filter((text): text is string => text !== undefined),
      sockets: asArray(item.sockets)
        .map(
          (value) =>
            displayString(value) ??
            asString(asRecord(asRecord(value)?.item)?.name),
        )
        .filter((text): text is string => text !== undefined),
      spells: asArray(item.spells)
        .map((value) => asString(asRecord(value)?.description))
        .filter((text): text is string => text !== undefined),
      set,
      requirements: [
        displayString(requirements?.level),
        displayString(requirements?.playable_classes),
        displayString(requirements?.skill),
        displayString(requirements?.reputation),
      ].filter((text): text is string => text !== undefined),
      durability: displayString(item.durability),
      description: asString(item.description),
    };
  }

  private mapSet(set: Record<string, unknown> | undefined) {
    const name =
      asString(asRecord(set?.item_set)?.name) ?? displayString(set ?? {});

    if (!set || !name) {
      return undefined;
    }

    return {
      name,
      items: asArray(set.items).flatMap((value) => {
        const entry = asRecord(value);
        const itemName = asString(asRecord(entry?.item)?.name);
        return itemName
          ? [
              {
                name: itemName,
                equipped: asBoolean(entry?.is_equipped) ?? false,
              },
            ]
          : [];
      }),
      effects: asArray(set.effects).flatMap((value) => {
        const effect = asRecord(value);
        const text = displayString(effect);
        return text
          ? [{ text, active: asBoolean(effect?.is_active) ?? false }]
          : [];
      }),
    };
  }

  private async getIcon(
    item: Record<string, unknown>,
  ): Promise<string | undefined> {
    const href = asString(asRecord(asRecord(item.media)?.key)?.href);

    if (!href) {
      return undefined;
    }

    try {
      return pickAsset(
        await this.client.getHref<unknown>(href, CACHE_TTL.media),
        ['icon'],
      );
    } catch {
      return undefined;
    }
  }
}
