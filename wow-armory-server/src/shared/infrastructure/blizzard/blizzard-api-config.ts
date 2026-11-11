import { ConfigService } from '@nestjs/config';

/**
 * Game catalogs of the Blizzard API. Each one has its own namespaces:
 * - `classic`: progression Classic (`*-classic-{region}`).
 * - `classicann`: Classic Anniversary realms, now in The Burning Crusade
 *   (`*-classicann-{region}`), e.g. Nightslayer or Thunderstrike.
 * - `classic1x`: Classic Era, Hardcore and Season of Discovery
 *   (`*-classic1x-{region}`).
 * - `retail`: the current expansion (`*-{region}`).
 */
export const WOW_MODES = [
  'classic',
  'classicann',
  'classic1x',
  'retail',
] as const;

export type WowMode = (typeof WOW_MODES)[number];

export interface BlizzardApiSettings {
  region: string;
  locale: string;
  /** Profile namespaces (`profile-*`), used by character and account APIs. */
  namespaces: Record<WowMode, string>;
  /** Static namespaces (`static-*`), used by game data media APIs. */
  staticNamespaces: Record<WowMode, string>;
  /** Dynamic namespaces (`dynamic-*`): realms, auctions and leaderboards. */
  dynamicNamespaces: Record<WowMode, string>;
}

/**
 * Resolves every Blizzard API namespace from the configured region so a single
 * `BLIZZARD_REGION=eu` switches all upstream calls to the EU namespaces. Each
 * namespace can still be overridden explicitly through its own variable
 * (`BLIZZARD_NAMESPACE_<MODE>`, `BLIZZARD_STATIC_NAMESPACE_<MODE>` and
 * `BLIZZARD_DYNAMIC_NAMESPACE_<MODE>`).
 */
export function resolveBlizzardApiSettings(
  config: ConfigService,
): BlizzardApiSettings {
  const region = config.get<string>('BLIZZARD_REGION', 'us').toLowerCase();
  const get = (key: string, fallback: string): string =>
    config.get<string>(key)?.trim() || fallback;
  // `profile-us` for retail, `profile-classicann-us` for the Classic catalogs.
  const defaultNamespace = (kind: string, mode: WowMode): string =>
    mode === 'retail' ? `${kind}-${region}` : `${kind}-${mode}-${region}`;
  const resolve = (kind: string, prefix: string): Record<WowMode, string> =>
    Object.fromEntries(
      WOW_MODES.map((mode) => [
        mode,
        get(`${prefix}_${mode.toUpperCase()}`, defaultNamespace(kind, mode)),
      ]),
    ) as Record<WowMode, string>;

  const namespaces = resolve('profile', 'BLIZZARD_NAMESPACE');
  // Legacy variable: `BLIZZARD_NAMESPACE` alone overrides the Classic profile.
  namespaces.classic = get(
    'BLIZZARD_NAMESPACE_CLASSIC',
    get('BLIZZARD_NAMESPACE', defaultNamespace('profile', 'classic')),
  );

  return {
    region,
    locale: get('BLIZZARD_LOCALE', 'en_US'),
    namespaces,
    staticNamespaces: resolve('static', 'BLIZZARD_STATIC_NAMESPACE'),
    dynamicNamespaces: resolve('dynamic', 'BLIZZARD_DYNAMIC_NAMESPACE'),
  };
}

export function parseWowMode(value: unknown): WowMode {
  return (WOW_MODES as readonly unknown[]).includes(value)
    ? (value as WowMode)
    : 'classic';
}

/** Blizzard profile paths require lowercase realm slugs and character names. */
export function toBlizzardPathSegment(value: string): string {
  return encodeURIComponent(value.toLocaleLowerCase('en-US'));
}
