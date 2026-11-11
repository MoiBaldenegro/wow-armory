import { ConfigService } from '@nestjs/config';
import {
  parseWowMode,
  resolveBlizzardApiSettings,
  toBlizzardPathSegment,
} from './blizzard-api-config';

describe('resolveBlizzardApiSettings', () => {
  it('derives every namespace from the region', () => {
    const settings = resolveBlizzardApiSettings(
      new ConfigService({ BLIZZARD_REGION: 'eu' }),
    );

    expect(settings).toEqual({
      region: 'eu',
      locale: 'en_US',
      namespaces: { classic: 'profile-classic-eu', retail: 'profile-eu' },
      staticNamespaces: { classic: 'static-classic-eu', retail: 'static-eu' },
    });
  });

  it('honours explicit overrides', () => {
    const settings = resolveBlizzardApiSettings(
      new ConfigService({
        BLIZZARD_REGION: 'us',
        BLIZZARD_NAMESPACE: 'profile-classic1x-us',
        BLIZZARD_NAMESPACE_RETAIL: 'profile-custom',
        BLIZZARD_LOCALE: 'es_MX',
      }),
    );

    expect(settings.namespaces).toEqual({
      classic: 'profile-classic1x-us',
      retail: 'profile-custom',
    });
    expect(settings.locale).toBe('es_MX');
  });
});

describe('helpers', () => {
  it('parses the mode with classic as default', () => {
    expect(parseWowMode('retail')).toBe('retail');
    expect(parseWowMode('anything')).toBe('classic');
    expect(parseWowMode(undefined)).toBe('classic');
  });

  it('lowercases and encodes path segments', () => {
    expect(toBlizzardPathSegment('Billiemoi')).toBe('billiemoi');
    expect(toBlizzardPathSegment('Ñandú')).toBe(encodeURIComponent('ñandú'));
  });
});
