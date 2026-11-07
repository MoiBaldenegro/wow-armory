import { CharacterValidation } from '../../domain/character/errors/CharacterErrors';
import { CHARACTER_NAME_PATTERN, REALM_SLUG_PATTERN } from './GetCharacter';

export type SearchField = 'realm' | 'name' | 'query';
export type SearchErrorReason = 'empty' | 'invalid';

export interface CharacterSearch {
  realmSlug: string;
  characterName: string;
}

/**
 * Validation error raised while normalizing search input. It is still a
 * `CharacterValidation`, but also tells which field failed and why so the
 * presentation layer can show a field-specific message.
 */
export class InvalidSearchInput extends CharacterValidation {
  readonly field: SearchField;
  readonly reason: SearchErrorReason;

  constructor(field: SearchField, reason: SearchErrorReason) {
    super(InvalidSearchInput.describe(field, reason));
    this.field = field;
    this.reason = reason;
  }

  private static describe(
    field: SearchField,
    reason: SearchErrorReason,
  ): string {
    if (field === 'query') {
      return 'Search query must use the realm/name format.';
    }

    const subject = field === 'realm' ? 'Realm' : 'Character name';
    return reason === 'empty'
      ? `${subject} is required.`
      : `${subject} has an invalid format.`;
  }
}

const APOSTROPHES = /['’]/g;
const WHITESPACE = /\s+/g;

export function normalizeRealmSlug(realmInput: string): string {
  const trimmed = realmInput.trim();

  if (trimmed === '') {
    throw new InvalidSearchInput('realm', 'empty');
  }

  const realmSlug = trimmed
    .toLowerCase()
    .replace(APOSTROPHES, '')
    .replace(WHITESPACE, '-');

  if (!REALM_SLUG_PATTERN.test(realmSlug)) {
    throw new InvalidSearchInput('realm', 'invalid');
  }

  return realmSlug;
}

export function normalizeCharacterName(nameInput: string): string {
  const trimmed = nameInput.trim();

  if (trimmed === '') {
    throw new InvalidSearchInput('name', 'empty');
  }

  const characterName = trimmed.toLowerCase();

  if (!CHARACTER_NAME_PATTERN.test(characterName)) {
    throw new InvalidSearchInput('name', 'invalid');
  }

  return characterName;
}

/** Normalizes the two search fields into the route/use case parameters. */
export function searchCharacter(
  realmInput: string,
  nameInput: string,
): CharacterSearch {
  return {
    realmSlug: normalizeRealmSlug(realmInput),
    characterName: normalizeCharacterName(nameInput),
  };
}

/** Parses a single `realm/name` query (e.g. `grobbulus/Billiemoi`). */
export function parseCharacterQuery(query: string): CharacterSearch {
  const parts = query.split('/');

  if (
    parts.length !== 2 ||
    parts[0].trim() === '' ||
    parts[1].trim() === ''
  ) {
    throw new InvalidSearchInput('query', 'invalid');
  }

  return searchCharacter(parts[0], parts[1]);
}
