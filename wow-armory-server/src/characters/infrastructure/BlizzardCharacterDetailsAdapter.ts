import axios from 'axios';
import { ApplicationTokenProvider } from '../application/ports/ApplicationTokenProvider';

type RawRecord = Record<string, unknown>;

export interface CharacterMediaAsset {
  key: string;
  url: string;
}

export interface CharacterEquipmentItem {
  slot: string;
  name: string;
  level?: number;
  quality?: string;
  iconUrl?: string;
}

export interface CharacterDetails {
  media: CharacterMediaAsset[];
  equipment: CharacterEquipmentItem[];
}

export class BlizzardCharacterDetailsAdapter {
  constructor(
    private readonly tokenProvider: ApplicationTokenProvider,
    private readonly config: {
      region: string;
      namespace: string;
      locale: string;
      namespaces?: Partial<Record<'retail' | 'classic', string>>;
    },
  ) {}

  async getDetails(
    realmSlug: string,
    characterName: string,
    mode: 'retail' | 'classic',
  ): Promise<CharacterDetails> {
    const token = await this.tokenProvider.getAccessToken();
    const namespace = this.config.namespaces?.[mode] ?? this.config.namespace;
    const baseUrl = `https://${this.config.region}.api.blizzard.com/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(characterName)}`;
    const params = { namespace, locale: this.config.locale };
    const [media, equipment] = await Promise.all([
      this.get<unknown>(`${baseUrl}/character-media`, token, params),
      this.get<unknown>(`${baseUrl}/equipment`, token, params),
    ]);

    return {
      media: this.mapMedia(media),
      equipment: await this.mapEquipment(equipment, token),
    };
  }

  private async get<T>(
    url: string,
    token: string,
    params: Record<string, string>,
  ): Promise<T> {
    const response = await axios.get<T>(url, {
      headers: { Authorization: `Bearer ${token}` },
      params,
      timeout: 10_000,
    });

    return response.data;
  }

  private mapMedia(payload: unknown): CharacterMediaAsset[] {
    const assets = Array.isArray((payload as RawRecord)?.assets)
      ? ((payload as RawRecord).assets as unknown[])
      : [];

    return assets.flatMap((asset) => {
      const item = asset as RawRecord;
      const key = typeof item.key === 'string' ? item.key : undefined;
      const url = typeof item.value === 'string' ? item.value : undefined;

      return key && url ? [{ key, url }] : [];
    });
  }

  private async mapEquipment(
    payload: unknown,
    token: string,
  ): Promise<CharacterEquipmentItem[]> {
    const items = Array.isArray((payload as RawRecord)?.equipped_items)
      ? ((payload as RawRecord).equipped_items as unknown[])
      : [];

    return (
      await Promise.all(
        items.map(async (value): Promise<CharacterEquipmentItem | undefined> => {
          const item = value as RawRecord;
          const slot = (item.slot as RawRecord | undefined)?.name;
          const name = (item.name as string | undefined) ?? undefined;

          if (typeof slot !== 'string' || typeof name !== 'string') {
            return undefined;
          }

          const media = item.media as RawRecord | undefined;
          const mediaKey = media?.key as RawRecord | undefined;
          let iconUrl: string | undefined;

          if (typeof mediaKey?.href === 'string') {
            try {
              iconUrl = await this.getMediaAsset(mediaKey.href, token);
            } catch (error) {
              if (!axios.isAxiosError(error)) {
                throw error;
              }
            }
          }

          return {
            slot,
            name,
            level:
              typeof (item.level as RawRecord | undefined)?.value === 'number'
                ? ((item.level as RawRecord).value as number)
                : undefined,
            quality: (item.quality as RawRecord | undefined)?.name as
              | string
              | undefined,
            iconUrl,
          };
        }),
      )
    ).filter((item): item is CharacterEquipmentItem => item !== undefined);
  }

  private async getMediaAsset(
    href: string,
    token: string,
  ): Promise<string | undefined> {
    const response = await axios.get<unknown>(href, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    });
    const assets = (response.data as RawRecord)?.assets;

    if (!Array.isArray(assets)) {
      return undefined;
    }

    const asset = assets.find(
      (value) => typeof (value as RawRecord)?.value === 'string',
    ) as RawRecord | undefined;

    return typeof asset?.value === 'string' ? asset.value : undefined;
  }
}
