import { render, screen } from '@testing-library/react';
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
          <HomePage />
        </AuthProvider>
      </ThemeProvider>
    </UseCasesProvider>,
  );
}

describe('HomePage', () => {
  it('renders the existing mock character content', () => {
    renderHome();

    expect(
      screen.getByRole('heading', { name: 'Thrall', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Guardians of Azeroth'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Recent Achievements/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Glory of the Dragonflight Hero'),
    ).toBeInTheDocument();
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
