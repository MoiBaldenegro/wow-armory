import type { WowMode } from '../../../domain/armory/Armory';

export interface CharacterSectionProps {
  realmSlug: string;
  characterName: string;
  mode: WowMode;
}
