import { ConfigService } from '@nestjs/config';

export type WowMode = 'retail' | 'classic';

export interface BlizzardApiSettings {
  region: string;
  locale: string;
  /** Profile namespaces (`profile-*`), used by character and account APIs. */
  namespaces: Record<WowMode, string>;
  /** Static namespaces (`static-*`), used by game data media APIs. */
  staticNamespaces: Record<WowMode, string>;
}

/**
 * Resolves every Blizzard API namespace from the configured region so a single
 * `BLIZZARD_REGION=eu` switches all upstream calls to the EU namespaces. Each
 * namespace can still be overridden explicitly through its own variable.
 */
export function resolveBlizzardApiSettings(
  config: ConfigService,
): BlizzardApiSettings {
  const region = config.get<string>('BLIZZARD_REGION', 'us').toLowerCase();
  const get = (key: string, fallback: string): string =>
    config.get<string>(key)?.trim() || fallback;

  return {
    region,
    locale: get('BLIZZARD_LOCALE', 'en_US'),
    namespaces: {
      classic: get(
        'BLIZZARD_NAMESPACE_CLASSIC',
        get('BLIZZARD_NAMESPACE', `profile-classic-${region}`),
      ),
      retail: get('BLIZZARD_NAMESPACE_RETAIL', `profile-${region}`),
    },
    staticNamespaces: {
      classic: get(
        'BLIZZARD_STATIC_NAMESPACE_CLASSIC',
        `static-classic-${region}`,
      ),
      retail: get('BLIZZARD_STATIC_NAMESPACE_RETAIL', `static-${region}`),
    },
  };
}

export function parseWowMode(value: unknown): WowMode {
  return value === 'retail' ? 'retail' : 'classic';
}

/** Blizzard profile paths require lowercase realm slugs and character names. */
export function toBlizzardPathSegment(value: string): string {
  return encodeURIComponent(value.toLocaleLowerCase('en-US'));
}
