import { BlizzardApiClient } from './blizzard-api-client';
import { BlizzardApiSettings } from './blizzard-api-config';
import { BlizzardCache } from './blizzard-cache';

export function testBlizzardSettings(region = 'eu'): BlizzardApiSettings {
  return {
    region,
    locale: 'en_US',
    namespaces: {
      classic: `profile-classic-${region}`,
      classicann: `profile-classicann-${region}`,
      classic1x: `profile-classic1x-${region}`,
      retail: `profile-${region}`,
    },
    staticNamespaces: {
      classic: `static-classic-${region}`,
      classicann: `static-classicann-${region}`,
      classic1x: `static-classic1x-${region}`,
      retail: `static-${region}`,
    },
    dynamicNamespaces: {
      classic: `dynamic-classic-${region}`,
      classicann: `dynamic-classicann-${region}`,
      classic1x: `dynamic-classic1x-${region}`,
      retail: `dynamic-${region}`,
    },
  };
}

/** Real client with a fake token provider and a fresh cache per test. */
export function createTestBlizzardClient(region = 'eu'): BlizzardApiClient {
  return new BlizzardApiClient(
    { getAccessToken: jest.fn().mockResolvedValue('app-token') },
    testBlizzardSettings(region),
    new BlizzardCache(),
  );
}

/**
 * Mocks `axios.get` with a route table keyed by path (without host and
 * query). Unknown paths answer 404 as Blizzard does.
 */
export function mockBlizzardRoutes(
  axiosModule: { get: unknown; isAxiosError: unknown },
  routes: Record<string, unknown>,
): jest.SpyInstance {
  jest
    .spyOn(
      axiosModule as { isAxiosError: (e: unknown) => boolean },
      'isAxiosError',
    )
    .mockImplementation(
      (error: unknown) =>
        (error as { isAxiosError?: boolean })?.isAxiosError === true,
    );

  return jest
    .spyOn(axiosModule as { get: (url: string) => Promise<unknown> }, 'get')
    .mockImplementation(async (url: string) => {
      const path = new URL(url).pathname;

      if (path in routes) {
        const value = routes[path];
        if (value instanceof Error) {
          throw value;
        }
        return { data: value };
      }

      throw { isAxiosError: true, response: { status: 404, headers: {} } };
    });
}
