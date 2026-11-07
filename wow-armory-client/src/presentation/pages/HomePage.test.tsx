import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { createTestDependencies } from '../../test/fakes';
import { AuthProvider } from '../providers/AuthProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import { UseCasesProvider } from '../providers/UseCasesProvider';
import { HomePage } from './HomePage';

function renderHome() {
  const { useCases } = createTestDependencies();

  return render(
    <UseCasesProvider useCases={useCases}>
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter>
            <HomePage />
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    </UseCasesProvider>,
  );
}

describe('HomePage', () => {
  it('renders the empty state with the character search', () => {
    renderHome();

    expect(
      screen.getByRole('heading', { name: 'Busca un personaje', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('search', { name: 'Buscar personaje' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Reino')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.queryByText('Thrall')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cambiar a tema oscuro' }),
    ).toBeInTheDocument();
  });

  it('keeps showing the auth_error banner from the URL', () => {
    window.history.replaceState({}, '', '/?auth_error=access_denied');

    renderHome();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Has cancelado el inicio de sesión de Battle.net',
    );

    window.history.replaceState({}, '', '/');
  });
});
