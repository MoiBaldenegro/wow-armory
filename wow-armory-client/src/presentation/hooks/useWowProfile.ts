import { useEffect, useState } from 'react';
import type { WowProfile } from '../../domain/profile/WowProfile';
import { useUseCases } from './useUseCases';

type WowProfileState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; profile: WowProfile }
  | { status: 'error' };

export function useWowProfile(enabled: boolean) {
  const { getWowProfile } = useUseCases();
  const [state, setState] = useState<WowProfileState>({
    status: enabled && getWowProfile ? 'loading' : 'idle',
  });

  useEffect(() => {
    if (!enabled || !getWowProfile) {
      setState({ status: 'idle' });
      return;
    }

    let active = true;
    setState({ status: 'loading' });

    getWowProfile.execute().then(
      (profile) => {
        if (active) {
          setState({ status: 'success', profile });
        }
      },
      () => {
        if (active) {
          setState({ status: 'error' });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [enabled, getWowProfile]);

  return state;
}
