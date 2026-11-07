import { Character } from '../Character';
import { CharacterName } from '../CharacterName';
import { RealmSlug } from '../RealmSlug';

/**
 * Outbound port for character lookups. Implementations translate external
 * failures into domain errors and return `null` when the character does not
 * exist so the use case owns the "not found" decision.
 */
export interface CharacterRepository {
  findByRealmAndName(
    realm: RealmSlug,
    name: CharacterName,
    mode?: 'retail' | 'classic',
  ): Promise<Character | null>;
}
