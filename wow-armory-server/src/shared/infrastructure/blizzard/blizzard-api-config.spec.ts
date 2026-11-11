import { ConfigService } from '@nestjs/config';
import {
  WOW_MODES,
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
      namespaces: {
        classic: 'profile-classic-eu',
        classicann: 'profile-classicann-eu',
        classic1x: 'profile-classic1x-eu',
        retail: 'profile-eu',
      },
      staticNamespaces: {
        classic: 'static-classic-eu',
        classicann: 'static-classicann-eu',
        classic1x: 'static-classic1x-eu',
        retail: 'static-eu',
      },
      dynamicNamespaces: {
        classic: 'dynamic-classic-eu',
        classicann: 'dynamic-classicann-eu',
        classic1x: 'dynamic-classic1x-eu',
        retail: 'dynamic-eu',
      },
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
      classicann: 'profile-classicann-us',
      classic1x: 'profile-classic1x-us',
      retail: 'profile-custom',
    });
    expect(settings.locale).toBe('es_MX');
  });

  it('lets each Classic catalog be overridden on its own', () => {
    const settings = resolveBlizzardApiSettings(
      new ConfigService({
        BLIZZARD_NAMESPACE_CLASSICANN: 'profile-custom-ann',
        BLIZZARD_DYNAMIC_NAMESPACE_CLASSIC1X: 'dynamic-custom-era',
      }),
    );

    expect(settings.namespaces.classicann).toBe('profile-custom-ann');
    expect(settings.dynamicNamespaces.classic1x).toBe('dynamic-custom-era');
    expect(settings.staticNamespaces.classicann).toBe('static-classicann-us');
  });
});

describe('helpers', () => {
  it('parses the mode with classic as default', () => {
    expect(parseWowMode('retail')).toBe('retail');
    // Anniversary realms (TBC, e.g. Nightslayer) and Classic Era have their own catalogs.
    expect(parseWowMode('classicann')).toBe('classicann');
    expect(parseWowMode('classic1x')).toBe('classic1x');
    expect(WOW_MODES).toEqual(['classic', 'classicann', 'classic1x', 'retail']);
    expect(parseWowMode('anything')).toBe('classic');
    expect(parseWowMode(undefined)).toBe('classic');
  });

  it('lowercases and encodes path segments', () => {
    expect(toBlizzardPathSegment('Billiemoi')).toBe('billiemoi');
    expect(toBlizzardPathSegment('Ñandú')).toBe(encodeURIComponent('ñandú'));
  });
});
