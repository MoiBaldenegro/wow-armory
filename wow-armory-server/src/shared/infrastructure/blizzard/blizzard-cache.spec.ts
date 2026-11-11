import { BlizzardCache } from './blizzard-cache';

describe('BlizzardCache', () => {
  it('returns cached values until they expire', async () => {
    let now = 0;
    const cache = new BlizzardCache(10, () => now);
    const loader = jest.fn().mockResolvedValue('value');

    await cache.getOrLoad('key', 1000, loader);
    await cache.getOrLoad('key', 1000, loader);
    expect(loader).toHaveBeenCalledTimes(1);

    now = 1000;
    await cache.getOrLoad('key', 1000, loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent loads and never caches failures', async () => {
    const cache = new BlizzardCache();
    const loader = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('ok');

    await expect(
      Promise.all([
        cache.getOrLoad('k', 1000, loader),
        cache.getOrLoad('k', 1000, loader),
      ]),
    ).rejects.toThrow('boom');
    expect(loader).toHaveBeenCalledTimes(1);

    await expect(cache.getOrLoad('k', 1000, loader)).resolves.toBe('ok');
  });

  it('evicts the oldest entries beyond the limit and skips ttl 0', () => {
    const cache = new BlizzardCache(2);
    cache.set('a', 1, 1000);
    cache.set('b', 2, 1000);
    cache.set('c', 3, 1000);
    cache.set('d', 4, 0);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBeUndefined();
    expect(cache.size).toBe(2);
  });
});
