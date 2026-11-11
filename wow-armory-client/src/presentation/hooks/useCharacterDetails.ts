import { useEffect, useState } from 'react';
import type { CharacterDetails } from '../../domain/character/CharacterDetails';
import { useUseCases } from './useUseCases';
import type { WowMode } from '../../domain/armory/Armory';

export function useCharacterDetails(
  realmSlug: string,
  characterName: string,
  mode: WowMode,
) {
  const { getCharacterDetails } = useUseCases();
  const [details, setDetails] = useState<CharacterDetails | null>(null);

  useEffect(() => {
    if (!getCharacterDetails) {
      return;
    }

    let active = true;
    setDetails(null);

    getCharacterDetails.execute(realmSlug, characterName, mode).then(
      (value) => {
        if (active) {
          setDetails(value);
        }
      },
      () => {
        if (active) {
          setDetails({ media: [], equipment: [] });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [characterName, getCharacterDetails, mode, realmSlug]);

  return details;
}
