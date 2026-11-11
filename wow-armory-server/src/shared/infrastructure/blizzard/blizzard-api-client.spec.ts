import axios from 'axios';
import {
  BlizzardRateLimited,
  BlizzardResourceNotFound,
  BlizzardUnavailable,
} from '../../../characters/domain/errors/CharacterError';
import { pickAsset } from './blizzard-api-client';
import { createTestBlizzardClient } from './testing';

function axiosError(status: number, headers: Record<string, unknown> = {}) {
  return { isAxiosError: true, response: { status, headers } };
}

describe('BlizzardApiClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('adds token, namespace and locale and caches the response', async () => {
    const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: { ok: 1 } });
    const client = createTestBlizzardClient('eu');
    const options = {
      mode: 'classic' as const,
      namespace: 'dynamic' as const,
      ttlMs: 1000,
    };

    await client.get('/data/wow/realm/index', options);
    await expect(client.get('/data/wow/realm/index', options)).resolves.toEqual(
      { ok: 1 },
    );

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(
      'https://eu.api.blizzard.com/data/wow/realm/index',
      {
        headers: { Authorization: 'Bearer app-token' },
        params: { namespace: 'dynamic-classic-eu', locale: 'en_US' },
        timeout: 10_000,
      },
    );
  });

  it.each([
    [404, BlizzardResourceNotFound],
    [429, BlizzardRateLimited],
    [500, BlizzardUnavailable],
  ])('maps HTTP %s to a domain error', async (status, type) => {
    jest
      .spyOn(axios, 'get')
      .mockRejectedValue(axiosError(status, { 'retry-after': '7' }));
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const promise = createTestBlizzardClient().get('/x', {
      mode: 'retail',
      namespace: 'static',
      ttlMs: 0,
    });

    await expect(promise).rejects.toBeInstanceOf(type);
    if (status === 429) {
      await expect(promise).rejects.toMatchObject({ retryAfterSeconds: 7 });
    }
  });

  it('only follows hrefs on Blizzard API hosts', async () => {
    const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: {} });
    const client = createTestBlizzardClient();

    await expect(
      client.getHref('https://evil.example.com/x', 1000),
    ).rejects.toBeInstanceOf(BlizzardUnavailable);
    await client.getHref(
      'https://eu.api.blizzard.com/data/wow/media/item/1?namespace=static-eu',
      1000,
    );
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('picks assets by preferred key', () => {
    const payload = {
      assets: [
        { key: 'avatar', value: 'a' },
        { key: 'main-raw', value: 'm' },
      ],
    };
    expect(pickAsset(payload, ['main-raw'])).toBe('m');
    expect(pickAsset(payload, ['zoom'])).toBe('a');
    expect(pickAsset({}, ['zoom'])).toBeUndefined();
  });
});
