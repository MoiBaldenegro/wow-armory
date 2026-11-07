import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Character } from '../../domain/character/Character';
import {
  CharacterRateLimited,
  CharacterUnavailable,
} from '../../domain/character/errors/CharacterErrors';
import type { CharacterRepository } from '../../domain/character/ports/CharacterRepository';
import { GetCharacter } from '../../application/character/GetCharacter';
import type { UseCases } from '../../infrastructure/container';
import { createTestDependencies } from '../../test/fakes';
import { UseCasesProvider } from '../providers/UseCasesProvider';
import { useCharacter } from './useCharacter';

const character: Character = {
  name: 'Billiemoi',
  realmSlug: 'grobbulus',
  level: 60,
  characterClass: 'Mage',
  race: 'Gnome',
  itemLevel: 120,
  achievementPoints: 500,
};

function wrapperFor(useCases: UseCases) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>;
  };
}

function renderUseCharacter(
  useCases: UseCases,
  realmSlug = 'grobbulus',
  characterName = 'billiemoi',
) {
  return renderHook(
    ({ realm, name }: { realm: string; name: string }) =>
      useCharacter(realm, name),
    {
      wrapper: wrapperFor(useCases),
      initialProps: { realm: realmSlug, name: characterName },
    },
  );
}

describe('useCharacter', () => {
  it('starts loading and resolves to success', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.result = character;

    const { result } = renderUseCharacter(useCases);

    expect(result.current.state).toEqual({ status: 'loading' });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'success', character });
    });
  });

  it('lowercases the name before calling the repository', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.result = character;

    const { result } = renderUseCharacter(useCases, 'grobbulus', 'Billiemoi');

    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });
    expect(characterRepository.calls).toEqual([
      { realmSlug: 'grobbulus', characterName: 'billiemoi' },
    ]);
  });

  it('maps a missing character to not-found', async () => {
    const { useCases } = createTestDependencies();

    const { result } = renderUseCharacter(useCases);

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'not-found' });
    });
  });

  it('maps invalid params to invalid without calling the repository', async () => {
    const { useCases, characterRepository } = createTestDependencies();

    const { result } = renderUseCharacter(useCases, 'bad..realm', 'billiemoi');

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'invalid' });
    });
    expect(characterRepository.calls).toHaveLength(0);
  });

  it('maps rate limiting with and without retry seconds', async () => {
    const withSeconds = createTestDependencies();
    withSeconds.characterRepository.error = new CharacterRateLimited(30);

    const first = renderUseCharacter(withSeconds.useCases);
    await waitFor(() => {
      expect(first.result.current.state).toEqual({
        status: 'rate-limited',
        retryAfterSeconds: 30,
      });
    });

    const withoutSeconds = createTestDependencies();
    withoutSeconds.characterRepository.error = new CharacterRateLimited();

    const second = renderUseCharacter(withoutSeconds.useCases);
    await waitFor(() => {
      expect(second.result.current.state).toEqual({ status: 'rate-limited' });
    });
  });

  it('maps unavailable and unknown errors to unavailable', async () => {
    const unavailable = createTestDependencies();
    unavailable.characterRepository.error = new CharacterUnavailable();
    const first = renderUseCharacter(unavailable.useCases);
    await waitFor(() => {
      expect(first.result.current.state).toEqual({ status: 'unavailable' });
    });

    const unknown = createTestDependencies();
    unknown.characterRepository.error = new TypeError('boom');
    const second = renderUseCharacter(unknown.useCases);
    await waitFor(() => {
      expect(second.result.current.state).toEqual({ status: 'unavailable' });
    });
  });

  it('retries by calling the repository again', async () => {
    const { useCases, characterRepository } = createTestDependencies();
    characterRepository.error = new CharacterUnavailable();

    const { result } = renderUseCharacter(useCases);
    await waitFor(() => {
      expect(result.current.state.status).toBe('unavailable');
    });

    characterRepository.error = undefined;
    characterRepository.result = character;
    act(() => {
      result.current.retry();
    });

    expect(result.current.state.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.state.status).toBe('success');
    });
    expect(characterRepository.calls).toHaveLength(2);
  });

  it('discards a stale response when the params change', async () => {
    const pending = new Map<string, (value: Character | null) => void>();
    const repository: CharacterRepository = {
      findByRealmAndName: (_realm, name) =>
        new Promise((resolve) => {
          pending.set(name, resolve);
        }),
    };
    const { useCases } = createTestDependencies({
      getCharacter: new GetCharacter(repository),
    });

    const { result, rerender } = renderUseCharacter(useCases, 'grobbulus', 'old');
    await waitFor(() => expect(pending.has('old')).toBe(true));

    rerender({ realm: 'grobbulus', name: 'new' });
    await waitFor(() => expect(pending.has('new')).toBe(true));

    await act(async () => {
      pending.get('old')?.({ ...character, name: 'Old' });
    });
    expect(result.current.state).toEqual({ status: 'loading' });

    await act(async () => {
      pending.get('new')?.({ ...character, name: 'New' });
    });
    expect(result.current.state).toEqual({
      status: 'success',
      character: { ...character, name: 'New' },
    });
  });

  it('does not update state after unmounting', async () => {
    let resolve: (value: Character | null) => void = () => undefined;
    const repository: CharacterRepository = {
      findByRealmAndName: () =>
        new Promise((done) => {
          resolve = done;
        }),
    };
    const { useCases } = createTestDependencies({
      getCharacter: new GetCharacter(repository),
    });
    const consoleError = vi.spyOn(console, 'error');

    const { result, unmount } = renderUseCharacter(useCases);
    await waitFor(() => expect(result.current.state.status).toBe('loading'));
    unmount();

    await act(async () => {
      resolve(character);
    });

    expect(result.current.state).toEqual({ status: 'loading' });
    expect(consoleError).not.toHaveBeenCalled();
  });
});
