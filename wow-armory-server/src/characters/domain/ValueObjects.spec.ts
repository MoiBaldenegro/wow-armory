import { AchievementPoints } from './AchievementPoints';
import { CharacterError } from './errors/CharacterError';
import { ItemLevel } from './ItemLevel';

describe('ItemLevel', () => {
  it('accepts zero and positive integers', () => {
    expect(ItemLevel.create(0).value).toBe(0);
    expect(ItemLevel.create(245).value).toBe(245);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the invalid value %s',
    (value) => {
      expect(() => ItemLevel.create(value)).toThrow(CharacterError);
    },
  );
});

describe('AchievementPoints', () => {
  it('accepts zero and positive integers', () => {
    expect(AchievementPoints.create(0).value).toBe(0);
    expect(AchievementPoints.create(12345).value).toBe(12345);
  });

  it.each([-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the invalid value %s',
    (value) => {
      expect(() => AchievementPoints.create(value)).toThrow(CharacterError);
    },
  );
});
