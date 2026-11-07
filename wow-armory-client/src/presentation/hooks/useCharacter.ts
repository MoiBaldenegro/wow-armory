import { useCallback, useEffect, useState } from 'react';
import type { Character } from '../../domain/character/Character';
import {
  CharacterNotFound,
  CharacterRateLimited,
  CharacterValidation,
} from '../../domain/character/errors/CharacterErrors';
import { useUseCases } from './useUseCases';

export type CharacterState =
  | { status: 'loading' }
  | { status: 'success'; character: Character }
  | { status: 'not-found' }
  | { status: 'invalid' }
  | { status: 'rate-limited'; retryAfterSeconds?: number }
  | { status: 'unavailable' };

export interface UseCharacterResult {
  state: CharacterState;
  retry: () => void;
}

const LOADING: CharacterState = { status: 'loading' };

function toErrorState(error: unknown): CharacterState {
  if (error instanceof CharacterNotFound) {
    return { status: 'not-found' };
  }

  if (error instanceof CharacterValidation) {
    return { status: 'invalid' };
  }

  if (error instanceof CharacterRateLimited) {
    return error.retryAfterSeconds === undefined
      ? { status: 'rate-limited' }
      : {
          status: 'rate-limited',
          retryAfterSeconds: error.retryAfterSeconds,
        };
  }

  // CharacterUnavailable and any unexpected error: never expose the raw error.
  return { status: 'unavailable' };
}

interface ResolvedState {
  requestKey: string;
  state: CharacterState;
}

export function useCharacter(
  realmSlug: string,
  characterName: string,
): UseCharacterResult {
  const { getCharacter } = useUseCases();
  const [attempt, setAttempt] = useState(0);
  const [resolved, setResolved] = useState<ResolvedState | null>(null);

  // Blizzard expects lowercase names/slugs and the server does not normalize
  // them, so `/character/grobbulus/Billiemoi` must query `billiemoi`.
  const normalizedRealm = realmSlug.toLowerCase();
  const normalizedName = characterName.toLowerCase();
  const requestKey = JSON.stringify([normalizedRealm, normalizedName, attempt]);

  useEffect(() => {
    let isCurrent = true;

    getCharacter.execute(normalizedRealm, normalizedName).then(
      (character) => {
        if (isCurrent) {
          setResolved({
            requestKey,
            state: { status: 'success', character },
          });
        }
      },
      (error: unknown) => {
        if (isCurrent) {
          setResolved({ requestKey, state: toErrorState(error) });
        }
      },
    );

    // Stale responses (params changed, retry or unmount) are discarded.
    return () => {
      isCurrent = false;
    };
  }, [getCharacter, normalizedRealm, normalizedName, requestKey]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  // Until the response for the current request arrives, the state is loading;
  // a previous character is never shown for new parameters.
  const state =
    resolved !== null && resolved.requestKey === requestKey
      ? resolved.state
      : LOADING;

  return { state, retry };
}
