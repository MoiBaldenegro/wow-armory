import { InvalidRealmSlug } from './errors/CharacterError';
import { RealmSlug } from './RealmSlug';

describe('RealmSlug', () => {
  it.each(['grobbulus', 'area-52', 'a', 'a'.repeat(64)])(
    'accepts the valid slug "%s"',
    (value) => {
      expect(RealmSlug.create(value).value).toBe(value);
    },
  );

  it.each([
    '',
    'Grobbulus',
    'realm slug',
    'realm/slug',
    'realm%2Fslug',
    'realm?x=1',
    '..',
    'realm.slug',
    'realm_slug',
    'a'.repeat(65),
  ])('rejects the invalid slug "%s"', (value) => {
    expect(() => RealmSlug.create(value)).toThrow(InvalidRealmSlug);
  });

  it('rejects non-string values', () => {
    expect(() => RealmSlug.create(undefined as unknown as string)).toThrow(
      InvalidRealmSlug,
    );
  });
});
