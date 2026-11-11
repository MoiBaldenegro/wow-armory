import axios from 'axios';
import {
  BlizzardRateLimited,
  BlizzardUnavailable,
  CharacterNotFound,
} from '../domain/errors/CharacterError';
import { BlizzardCharacterDetailsAdapter } from './BlizzardCharacterDetailsAdapter';
import { createTestBlizzardClient } from '../../shared/infrastructure/blizzard/testing';

const BASE =
  'https://eu.api.blizzard.com/profile/wow/character/grobbulus/billiemoi';

function createAdapter() {
  return new BlizzardCharacterDetailsAdapter(createTestBlizzardClient('eu'));
}

function axiosError(status: number, headers: Record<string, unknown> = {}) {
  return { isAxiosError: true, response: { status, headers } };
}

describe('BlizzardCharacterDetailsAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requests lowercase paths with the namespace of the mode', async () => {
    const get = jest.spyOn(axios, 'get').mockImplementation(async (url) => {
      if (url === `${BASE}/character-media`) {
        return { data: { assets: [{ key: 'avatar', value: 'a.jpg' }] } };
      }

      return {
        data: {
          equipped_items: [
            {
              slot: { name: 'Head' },
              name: 'Helm',
              level: { value: 66 },
              quality: { name: 'Epic' },
            },
          ],
        },
      };
    });

    const details = await createAdapter().getDetails(
      'grobbulus',
      'Billiemoi',
      'retail',
    );

    expect(get).toHaveBeenCalledWith(
      `${BASE}/equipment`,
      expect.objectContaining({
        headers: { Authorization: 'Bearer app-token' },
        params: { namespace: 'profile-eu', locale: 'en_US' },
      }),
    );
    expect(details).toEqual({
      media: [{ key: 'avatar', url: 'a.jpg' }],
      equipment: [
        expect.objectContaining({
          slot: 'Head',
          name: 'Helm',
          level: 66,
          quality: 'Epic',
        }),
      ],
      renderUrl: 'a.jpg',
    });
  });

  it('degrades to empty media when only that endpoint fails', async () => {
    jest.spyOn(axios, 'get').mockImplementation(async (url) => {
      if (String(url).endsWith('/character-media')) {
        throw axiosError(404);
      }

      return { data: { equipped_items: [] } };
    });
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    await expect(
      createAdapter().getDetails('grobbulus', 'billiemoi', 'classic'),
    ).resolves.toEqual({ media: [], equipment: [] });
  });

  it.each([
    [404, CharacterNotFound],
    [429, BlizzardRateLimited],
    [503, BlizzardUnavailable],
  ])(
    'maps a %s from both endpoints to a domain error',
    async (status, type) => {
      jest.spyOn(axios, 'get').mockRejectedValue(axiosError(status));
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      await expect(
        createAdapter().getDetails('grobbulus', 'billiemoi', 'classic'),
      ).rejects.toBeInstanceOf(type);
    },
  );
});
