import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ErrorPage } from './ErrorPage';

function renderError(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ErrorPage />
    </MemoryRouter>,
  );
}

describe('ErrorPage', () => {
  it('translates auth_error codes to Spanish', () => {
    renderError('/error?auth_error=access_denied');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Has cancelado el inicio de sesión de Battle.net',
    );
    expect(
      screen.getByRole('link', { name: 'Volver al inicio' }),
    ).toBeInTheDocument();
  });

  it('accepts the code parameter', () => {
    renderError('/error?code=invalid_state');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La solicitud de inicio de sesión ha caducado',
    );
  });

  it('shows the auth_failed copy', () => {
    renderError('/error?auth_error=auth_failed');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo completar el inicio de sesión con Battle.net',
    );
  });

  it('shows a generic message for unknown codes', () => {
    renderError('/error?code=unknown_code');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo completar la autenticación',
    );
  });
});
