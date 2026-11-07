import { CharacterName } from './CharacterName';
import { InvalidCharacterName } from './errors/CharacterError';

describe('CharacterName', () => {
  it.each(['billiemoi', "o'hara", 'Zug-Zug', 'a', 'a'.repeat(64)])(
    'accepts the valid name "%s"',
    (value) => {
      expect(CharacterName.create(value).value).toBe(value);
    },
  );

  it.each([
    '',
    'Billie Mois',
    'billie/moi',
    'billie%2Fmoi',
    'billie?x=1',
    '..',
    'billie.moi',
    'a'.repeat(65),
    'josé',
  ])('rejects the invalid name "%s"', (value) => {
    expect(() => CharacterName.create(value)).toThrow(InvalidCharacterName);
  });

  it('rejects non-string values', () => {
    expect(() => CharacterName.create(undefined as unknown as string)).toThrow(
      InvalidCharacterName,
    );
  });
});
