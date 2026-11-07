import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestDependencies } from '../../test/fakes';
import { useUseCases } from '../hooks/useUseCases';
import { UseCasesProvider } from './UseCasesProvider';

function Consumer() {
  const useCases = useUseCases();
  return <span>{useCases.startLogin ? 'ready' : 'missing'}</span>;
}

describe('UseCasesProvider', () => {
  it('exposes the injected use cases', () => {
    const { useCases } = createTestDependencies();

    render(
      <UseCasesProvider useCases={useCases}>
        <Consumer />
      </UseCasesProvider>,
    );

    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  it('throws a clear error when useUseCases is used outside the provider', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => renderHook(() => useUseCases())).toThrow(
      /useUseCases must be used inside a UseCasesProvider/,
    );

    consoleError.mockRestore();
  });
});
