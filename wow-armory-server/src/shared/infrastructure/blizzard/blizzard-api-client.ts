import axios from 'axios';
import { ApplicationTokenProvider } from '../../../characters/application/ports/ApplicationTokenProvider';
import {
  BlizzardRateLimited,
  BlizzardResourceNotFound,
  BlizzardUnavailable,
} from '../../../characters/domain/errors/CharacterError';
import { BlizzardApiSettings, WowMode } from './blizzard-api-config';
import { BlizzardCache } from './blizzard-cache';

export type NamespaceKind = 'profile' | 'static' | 'dynamic';

export interface BlizzardRequestOptions {
  mode: WowMode;
  namespace: NamespaceKind;
  /** Cache lifetime in ms. 0 disables caching for this request. */
  ttlMs: number;
  params?: Record<string, string>;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export const CACHE_TTL = {
  /** Character profile data changes when the player logs out. */
  profile: 5 * 60_000,
  /** Guild data and leaderboards. */
  guild: 15 * 60_000,
  leaderboard: 15 * 60_000,
  /** Auction house snapshots refresh about once an hour. */
  auctions: 30 * 60_000,
  /** Realm lists and media rarely change. */
  realms: 6 * 60 * 60_000,
  media: 24 * 60 * 60_000,
} as const;

/**
 * Shared HTTP client for the Blizzard Game Data and Profile APIs. It adds the
 * application token, the namespace for the requested mode and the locale,
 * caches successful responses and translates upstream failures into domain
 * errors (404, 429 with Retry-After, everything else as unavailable).
 */
export class BlizzardApiClient {
  constructor(
    private readonly tokenProvider: ApplicationTokenProvider,
    readonly settings: BlizzardApiSettings,
    private readonly cache: BlizzardCache = new BlizzardCache(),
  ) {}

  get region(): string {
    return this.settings.region;
  }

  namespaceFor(kind: NamespaceKind, mode: WowMode): string {
    if (kind === 'profile') {
      return this.settings.namespaces[mode];
    }

    if (kind === 'static') {
      return this.settings.staticNamespaces[mode];
    }

    return this.settings.dynamicNamespaces[mode];
  }

  /** GET `https://{region}.api.blizzard.com{path}`. */
  get<T>(path: string, options: BlizzardRequestOptions): Promise<T> {
    return this.request<T>(
      `https://${this.settings.region}.api.blizzard.com${path}`,
      options,
    );
  }

  /**
   * GET a `key.href` returned by Blizzard. The href already carries its
   * namespace; only Blizzard API hosts are accepted.
   */
  getHref<T>(href: string, ttlMs: number): Promise<T> {
    const url = new URL(href);

    if (!/^[a-z]{2}\.api\.blizzard\.com$/.test(url.hostname)) {
      return Promise.reject(new BlizzardUnavailable());
    }

    return this.cache.getOrLoad(`href:${url.toString()}`, ttlMs, () =>
      this.fetch<T>(url.toString(), {}, DEFAULT_TIMEOUT_MS),
    );
  }

  private request<T>(url: string, options: BlizzardRequestOptions): Promise<T> {
    const params = {
      namespace: this.namespaceFor(options.namespace, options.mode),
      locale: this.settings.locale,
      ...options.params,
    };
    const key = `${url}?${new URLSearchParams(params).toString()}`;

    return this.cache.getOrLoad(key, options.ttlMs, () =>
      this.fetch<T>(url, params, options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    );
  }

  private async fetch<T>(
    url: string,
    params: Record<string, string>,
    timeout: number,
  ): Promise<T> {
    const token = await this.tokenProvider.getAccessToken();

    try {
      const response = await axios.get<T>(url, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        timeout,
      });

      return response.data;
    } catch (error) {
      throw toBlizzardError(error);
    }
  }
}

export function toBlizzardError(error: unknown): Error {
  if (
    error instanceof BlizzardResourceNotFound ||
    error instanceof BlizzardRateLimited ||
    error instanceof BlizzardUnavailable
  ) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 404) {
      return new BlizzardResourceNotFound();
    }

    if (status === 429) {
      const headers = (error.response?.headers ?? {}) as Record<
        string,
        unknown
      >;
      const retryAfter = Number(headers['retry-after']);
      return new BlizzardRateLimited(
        Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : undefined,
      );
    }
  }

  return new BlizzardUnavailable();
}

/** Picks the first asset whose key matches, in order of preference. */
export function pickAsset(
  payload: unknown,
  preferredKeys: string[] = [],
): string | undefined {
  const assets = (payload as { assets?: unknown } | undefined)?.assets;

  if (!Array.isArray(assets)) {
    return undefined;
  }

  const valid = assets.filter(
    (asset): asset is { key?: unknown; value: string } =>
      typeof (asset as { value?: unknown })?.value === 'string',
  );

  for (const key of preferredKeys) {
    const match = valid.find((asset) => asset.key === key);
    if (match) {
      return match.value;
    }
  }

  return valid[0]?.value;
}
