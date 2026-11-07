import { describe, expect, it } from 'vitest';
import { CharacterValidation } from '../../domain/character/errors/CharacterErrors';
import {
  InvalidSearchInput,
  parseCharacterQuery,
  searchCharacter,
} from './SearchCharacter';

function captureError(fn: () => unknown): InvalidSearchInput {
  try {
    fn();
  } catch (error) {
    if (error instanceof InvalidSearchInput) {
      return error;
    }

    throw error;
  }

  throw new Error('Expected an InvalidSearchInput error.');
}

describe('searchCharacter', () => {
  it('normalizes realm and name', () => {
    expect(searchCharacter('  Grobbulus ', ' Billiemoi  ')).toEqual({
      realmSlug: 'grobbulus',
      characterName: 'billiemoi',
    });
    expect(searchCharacter('Grobbulus', 'Thrall').characterName).toBe(
      'thrall',
    );
  });

  it('turns realm spaces into dashes and removes apostrophes', () => {
    expect(searchCharacter('Area 52', 'thrall').realmSlug).toBe('area-52');
    expect(searchCharacter("Kel'Thuzad", 'thrall').realmSlug).toBe(
      'kelthuzad',
    );
    expect(searchCharacter('Kel’Thuzad', 'thrall').realmSlug).toBe(
      'kelthuzad',
    );
    expect(searchCharacter('Burning   Blade', 'thrall').realmSlug).toBe(
      'burning-blade',
    );
  });

  it('keeps apostrophes and dashes allowed in names', () => {
    expect(searchCharacter('grobbulus', "D'Arc-x").characterName).toBe(
      "d'arc-x",
    );
  });

  it('rejects empty realm and name with distinct errors', () => {
    const realmError = captureError(() => searchCharacter('   ', 'thrall'));
    expect(realmError).toBeInstanceOf(CharacterValidation);
    expect(realmError.field).toBe('realm');
    expect(realmError.reason).toBe('empty');

    const nameError = captureError(() => searchCharacter('grobbulus', ''));
    expect(nameError.field).toBe('name');
    expect(nameError.reason).toBe('empty');
    expect(nameError.message).not.toBe(realmError.message);
  });

  it.each(['..', 'grob/bulus', 'grob%2Fbulus', 'grob.bulus'])(
    'rejects the invalid realm %s',
    (realm) => {
      const error = captureError(() => searchCharacter(realm, 'thrall'));
      expect(error.field).toBe('realm');
      expect(error.reason).toBe('invalid');
    },
  );

  it.each(['..', 'bil/lie', 'bil%2Flie', 'billie moi', 'Thrallë'])(
    'rejects the invalid name %s',
    (name) => {
      const error = captureError(() => searchCharacter('grobbulus', name));
      expect(error.field).toBe('name');
      expect(error.reason).toBe('invalid');
    },
  );
});

describe('parseCharacterQuery', () => {
  it('parses a realm/name query', () => {
    expect(parseCharacterQuery('grobbulus/Billiemoi')).toEqual({
      realmSlug: 'grobbulus',
      characterName: 'billiemoi',
    });
    expect(parseCharacterQuery(' Area 52 / Thrall ')).toEqual({
      realmSlug: 'area-52',
      characterName: 'thrall',
    });
  });

  it.each(['grobbulus', 'grobbulus/', '/billiemoi', 'a/b/c', '', ' / '])(
    'rejects the query %s without exactly one separator and two parts',
    (query) => {
      const error = captureError(() => parseCharacterQuery(query));
      expect(error).toBeInstanceOf(CharacterValidation);
      expect(error.field).toBe('query');
    },
  );

  it('reports field errors once the separator is valid', () => {
    expect(captureError(() => parseCharacterQuery('grob..bulus/x')).field).toBe(
      'realm',
    );
    expect(captureError(() => parseCharacterQuery('grobbulus/a b')).field).toBe(
      'name',
    );
  });
});
