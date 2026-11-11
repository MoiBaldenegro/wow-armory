import axios from 'axios';
import { AccessToken } from '../domain/AccessToken';
import { BattleNetWowProfileAdapter } from './BattleNetWowProfileAdapter';

function createAdapter(token: AccessToken | null) {
  return new BattleNetWowProfileAdapter(
    { getValidAccessToken: jest.fn().mockResolvedValue(token) },
    'eu',
    'en_US',
    {
      retail: 'profile-eu',
      classic: 'profile-classic-eu',
      classicann: 'profile-classicann-eu',
      classic1x: 'profile-classic1x-eu',
    },
  );
}

const NAMES: Record<string, string> = {
  'profile-eu': 'Retailer',
  'profile-classic-eu': 'Classicer',
  'profile-classicann-eu': 'Anniversarian',
  'profile-classic1x-eu': 'Eraer',
};

describe('BattleNetWowProfileAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns null without a user session', async () => {
    await expect(createAdapter(null).getProfile()).resolves.toBeNull();
  });

  it('sends the raw user token and merges every game catalog', async () => {
    const get = jest
      .spyOn(axios, 'get')
      .mockImplementation(async (_url, config) => {
        const namespace = (config?.params as { namespace: string }).namespace;
        return {
          data: {
            wow_accounts: [
              {
                characters: [
                  {
                    name: NAMES[namespace],
                    level: 60,
                    realm: { slug: 'firemaw', name: 'Firemaw' },
                    playable_class: { id: 1 },
                  },
                ],
              },
            ],
          },
        };
      });

    const profile = await createAdapter(
      AccessToken.create('user-token'),
    ).getProfile();

    expect(get).toHaveBeenCalledTimes(4);
    for (const [, config] of get.mock.calls) {
      expect(config?.headers?.Authorization).toBe('Bearer user-token');
    }
    expect(
      get.mock.calls.map(([, config]) => config?.params?.namespace),
    ).toEqual([
      'profile-eu',
      'profile-classic-eu',
      'profile-classicann-eu',
      'profile-classic1x-eu',
    ]);
    expect(profile?.characters.map((c) => `${c.mode}:${c.name}`)).toEqual([
      'retail:Retailer',
      'classic:Classicer',
      'classicann:Anniversarian',
      'classic1x:Eraer',
    ]);
  });

  it('throws when every namespace fails', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('401'));

    await expect(
      createAdapter(AccessToken.create('user-token')).getProfile(),
    ).rejects.toThrow('No WoW profile namespace was available.');
  });
});
