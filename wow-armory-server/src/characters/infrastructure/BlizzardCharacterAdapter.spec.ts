import axios from 'axios';
import { ApplicationTokenProvider } from '../application/ports/ApplicationTokenProvider';
import { CharacterName } from '../domain/CharacterName';
import {
  BlizzardRateLimited,
  BlizzardUnavailable,
} from '../domain/errors/CharacterError';
import { RealmSlug } from '../domain/RealmSlug';
import { BlizzardCharacterAdapter } from './BlizzardCharacterAdapter';

const REALM = RealmSlug.create('grobbulus');
const NAME = CharacterName.create('billiemoi');
const URL =
  'https://us.api.blizzard.com/profile/wow/character/grobbulus/billiemoi';

function createAdapter(tokenProvider?: ApplicationTokenProvider) {
  const provider: ApplicationTokenProvider = tokenProvider ?? {
    getAccessToken: jest.fn().mockResolvedValue('app-token'),
  };

  return new BlizzardCharacterAdapter(provider, {
    region: 'us',
    namespace: 'profile-classic-us',
  });
}

function axiosError(status: number, headers: Record<string, unknown> = {}) {
  return {
    isAxiosError: true,
    response: { status, headers },
  } as never;
}

describe('BlizzardCharacterAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls the configured profile URL with the application token', async () => {
    const get = jest.spyOn(axios, 'get').mockResolvedValue({
      data: {
        name: 'Billiemoi',
        level: 60,
        character_class: { name: 'Warrior' },
        race: { name: 'Orc' },
      },
    } as never);
    const adapter = createAdapter();

    const character = await adapter.findByRealmAndName(REALM, NAME);

    expect(character?.name.value).toBe('Billiemoi');

    const [url, config] = get.mock.calls[0] as [
      string,
      {
        headers?: Record<string, string>;
        params?: Record<string, string>;
      },
    ];

    expect(url).toBe(URL);
    expect(config.headers?.Authorization).toBe('Bearer app-token');
    expect(config.params).toEqual({
      namespace: 'profile-classic-us',
      locale: 'en_US',
    });
  });

  it('lowercases the character name required by the Profile API', async () => {
    const get = jest.spyOn(axios, 'get').mockResolvedValue({
      data: {
        name: 'Billiemoi',
        level: 60,
        character_class: { name: 'Warrior' },
        race: { name: 'Orc' },
      },
    } as never);
    const adapter = createAdapter();

    await adapter.findByRealmAndName(REALM, CharacterName.create('Billiemoi'));

    expect(get.mock.calls[0][0]).toBe(URL);
  });

  it('loads recent achievements from the achievements endpoint', async () => {
    jest.spyOn(axios, 'get').mockImplementation(async (url: string) => {
      if (url === `${URL}/achievements`) {
        return {
          data: {
            recent_events: [
              { achievement: { id: 1, name: 'Old' }, timestamp: 1000 },
              { achievement: { id: 2, name: 'New' }, timestamp: 2000 },
            ],
          },
        };
      }

      if (url.includes('/data/wow/media/achievement/')) {
        return { data: { assets: [{ key: 'icon', value: `${url}.jpg` }] } };
      }

      return {
        data: {
          name: 'Billiemoi',
          level: 60,
          character_class: { name: 'Warrior' },
          race: { name: 'Orc' },
          achievements: { href: `${URL}/achievements` },
        },
      };
    });
    const adapter = createAdapter();

    const character = await adapter.findByRealmAndName(REALM, NAME);

    expect(character?.achievements?.map((item) => item.name)).toEqual([
      'New',
      'Old',
    ]);
    expect(character?.achievements?.[0].iconUrl).toContain(
      '/data/wow/media/achievement/2',
    );
  });

  it('keeps the profile when the achievements endpoint fails', async () => {
    jest.spyOn(axios, 'get').mockImplementation(async (url: string) => {
      if (url.endsWith('/achievements')) {
        throw axiosError(404);
      }

      return {
        data: {
          name: 'Billiemoi',
          level: 60,
          character_class: { name: 'Warrior' },
          race: { name: 'Orc' },
        },
      };
    });

    const character = await createAdapter().findByRealmAndName(REALM, NAME);

    expect(character?.name.value).toBe('Billiemoi');
    expect(character?.achievements).toBeUndefined();
  });

  it('returns null when Blizzard answers 404', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(axiosError(404));
    const adapter = createAdapter();

    await expect(adapter.findByRealmAndName(REALM, NAME)).resolves.toBeNull();
  });

  it('translates 429 into BlizzardRateLimited and keeps Retry-After', async () => {
    jest
      .spyOn(axios, 'get')
      .mockRejectedValue(axiosError(429, { 'retry-after': '30' }));
    const adapter = createAdapter();

    const error = await adapter
      .findByRealmAndName(REALM, NAME)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BlizzardRateLimited);
    expect((error as BlizzardRateLimited).retryAfterSeconds).toBe(30);
  });

  it('translates 5xx into BlizzardUnavailable', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(axiosError(503));
    const adapter = createAdapter();

    await expect(
      adapter.findByRealmAndName(REALM, NAME),
    ).rejects.toBeInstanceOf(BlizzardUnavailable);
  });

  it('translates 401 and 403 into BlizzardUnavailable', async () => {
    jest
      .spyOn(axios, 'get')
      .mockRejectedValueOnce(axiosError(401))
      .mockRejectedValueOnce(axiosError(403));
    const adapter = createAdapter();

    await expect(
      adapter.findByRealmAndName(REALM, NAME),
    ).rejects.toBeInstanceOf(BlizzardUnavailable);

    await expect(
      adapter.findByRealmAndName(REALM, NAME),
    ).rejects.toBeInstanceOf(BlizzardUnavailable);
  });

  it('translates network errors without a response into BlizzardUnavailable', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue({
      isAxiosError: true,
      code: 'ECONNABORTED',
    } as never);
    const adapter = createAdapter();

    await expect(
      adapter.findByRealmAndName(REALM, NAME),
    ).rejects.toBeInstanceOf(BlizzardUnavailable);
  });

  it('propagates a token failure as BlizzardUnavailable without calling Blizzard', async () => {
    const get = jest.spyOn(axios, 'get');
    const tokenProvider: ApplicationTokenProvider = {
      getAccessToken: jest.fn().mockRejectedValue(new BlizzardUnavailable()),
    };
    const adapter = createAdapter(tokenProvider);

    await expect(
      adapter.findByRealmAndName(REALM, NAME),
    ).rejects.toBeInstanceOf(BlizzardUnavailable);
    expect(get).not.toHaveBeenCalled();
  });
});
