import { useCallback, useContext, useEffect, useState } from 'react';
import type { ArmoryQueries } from '../../application/armory/ArmoryQueries';
import { CharacterRateLimited } from '../../domain/character/errors/CharacterErrors';
import { UseCasesContext } from '../providers/use-cases-context';

export type ArmoryResourceState<T> =
  | { status: 'disabled' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'empty' }
  | { status: 'rate-limited'; retryAfterSeconds?: number }
  | { status: 'error' };

/**
 * Loads one armory resource. `key` identifies the request: a new key reloads
 * and `null` skips loading. `null`, `[]` and objects whose `isEmpty` returns
 * true are reported as `empty` so sections can hide themselves.
 */
export function useArmoryResource<T>(
  key: string | null,
  load: (armory: ArmoryQueries) => Promise<T | null>,
  isEmpty: (value: T) => boolean = (value) =>
    Array.isArray(value) && value.length === 0,
): ArmoryResourceState<T> & { retry: () => void } {
  // Optional: components using it also render outside a UseCasesProvider.
  const armory = useContext(UseCasesContext)?.armory;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ArmoryResourceState<T>>(
    armory && key !== null ? { status: 'loading' } : { status: 'disabled' },
  );

  useEffect(() => {
    if (!armory || key === null) {
      setState({ status: 'disabled' });
      return;
    }

    let active = true;
    setState({ status: 'loading' });

    load(armory).then(
      (value) => {
        if (!active) {
          return;
        }
        setState(
          value === null || isEmpty(value)
            ? { status: 'empty' }
            : { status: 'success', data: value },
        );
      },
      (error: unknown) => {
        if (!active) {
          return;
        }
        setState(
          error instanceof CharacterRateLimited
            ? { status: 'rate-limited', retryAfterSeconds: error.retryAfterSeconds }
            : { status: 'error' },
        );
      },
    );

    return () => {
      active = false;
    };
    // `load` and `isEmpty` are recreated every render; `key` captures inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armory, key, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
