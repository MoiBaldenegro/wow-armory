import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuthUnavailable } from '../../domain/auth/errors/AuthErrors';
import { createTestDependencies } from '../../test/fakes';
import { useAuth } from '../hooks/useAuth';
import { UseCasesProvider } from './UseCasesProvider';
import { AuthProvider } from './AuthProvider';

function createWrapper(
  useCases: ReturnType<typeof createTestDependencies>['useCases'],
  onRedirect?: (url: string) => void,
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <UseCasesProvider useCases={useCases}>
        <AuthProvider onRedirect={onRedirect}>{children}</AuthProvider>
      </UseCasesProvider>
    );
  };
}

describe('AuthProvider', () => {
  it('loads the session and exposes the authenticated user', async () => {
    const { useCases, authRepository } = createTestDependencies();
    authRepository.session = {
      authenticated: true,
      user: { battletag: 'Player#1234' },
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(useCases),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ battletag: 'Player#1234' });
    expect(result.current.error).toBeNull();
  });

  it('exposes the error in Spanish when the session check fails', async () => {
    const { useCases, authRepository } = createTestDependencies();
    authRepository.sessionError = new AuthUnavailable();

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(useCases),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe('No se pudo verificar la sesión.');
  });

  it('redirects to the Battle.net login URL', async () => {
    const { useCases, authRepository } = createTestDependencies();
    authRepository.loginUrl = 'https://oauth.battle.net/authorize?state=abc';
    const onRedirect = vi.fn();

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(useCases, onRedirect),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.login();
    });

    expect(onRedirect).toHaveBeenCalledWith(
      'https://oauth.battle.net/authorize?state=abc',
    );
  });

  it('shows a Spanish error when login cannot start', async () => {
    const { useCases, authRepository } = createTestDependencies();
    authRepository.loginError = new AuthUnavailable();

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(useCases),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.login();
    });

    expect(result.current.error).toBe(
      'No se pudo iniciar sesión con Battle.net.',
    );
  });

  it('clears the session on logout', async () => {
    const { useCases, authRepository } = createTestDependencies();
    authRepository.session = {
      authenticated: true,
      user: { battletag: 'Player#1234' },
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(useCases),
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(authRepository.logoutCalls).toBe(1);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeUndefined();
  });

  it('shows a Spanish error when logout fails', async () => {
    const { useCases, authRepository } = createTestDependencies();
    authRepository.session = { authenticated: true };
    authRepository.logoutError = new AuthUnavailable();

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(useCases),
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.error).toBe('No se pudo cerrar la sesión.');
  });

  it('re-checks the session when the page is restored from bfcache', async () => {
    const { useCases, authRepository } = createTestDependencies();

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(useCases),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);

    authRepository.session = {
      authenticated: true,
      user: { battletag: 'Player#1234' },
    };

    const event = new Event('pageshow');
    Object.defineProperty(event, 'persisted', { value: true });

    act(() => {
      window.dispatchEvent(event);
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
  });

  it('throws a clear error when useAuth is used outside the provider', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => renderHook(() => useAuth())).toThrow(
      /useAuth must be used inside an AuthProvider/,
    );

    consoleError.mockRestore();
  });
});
