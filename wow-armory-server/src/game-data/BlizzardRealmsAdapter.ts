import { BlizzardUnavailable } from '../characters/domain/errors/CharacterError';
import {
  BlizzardApiClient,
  CACHE_TTL,
} from '../shared/infrastructure/blizzard/blizzard-api-client';
import {
  toBlizzardPathSegment,
  WowMode,
} from '../shared/infrastructure/blizzard/blizzard-api-config';
import {
  asArray,
  asNumber,
  asRecord,
  asString,
} from '../shared/infrastructure/blizzard/raw';

export interface RealmSummary {
  name: string;
  slug: string;
}

export class BlizzardRealmsAdapter {
  constructor(private readonly client: BlizzardApiClient) {}

  async listRealms(mode: WowMode): Promise<RealmSummary[]> {
    const data = asRecord(
      await this.client.get<unknown>('/data/wow/realm/index', {
        mode,
        namespace: 'dynamic',
        ttlMs: CACHE_TTL.realms,
      }),
    );

    return asArray(data?.realms)
      .flatMap((value) => {
        const realm = asRecord(value);
        const name = asString(realm?.name);
        const slug = asString(realm?.slug);
        return name && slug ? [{ name, slug }] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Connected realm id of a realm (auctions live on connected realms). */
  async getConnectedRealmId(realmSlug: string, mode: WowMode): Promise<number> {
    const data = asRecord(
      await this.client.get<unknown>(
        `/data/wow/realm/${toBlizzardPathSegment(realmSlug)}`,
        { mode, namespace: 'dynamic', ttlMs: CACHE_TTL.realms },
      ),
    );
    const href = asString(asRecord(data?.connected_realm)?.href) ?? '';
    const id = asNumber(/\/connected-realm\/(\d+)/.exec(href)?.[1]);

    if (id === undefined) {
      throw new BlizzardUnavailable();
    }

    return id;
  }
}
