import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CharacterSearchForm } from './CharacterSearchForm';

function LocationDisplay() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
}

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<CharacterSearchForm />} />
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CharacterSearchForm', () => {
  it('exposes a named search form with labelled fields', () => {
    renderForm();

    expect(
      screen.getByRole('search', { name: 'Buscar personaje' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Reino')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument();
  });

  it('normalizes a valid search and navigates to the character route', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Reino'), "Kel'Thuzad");
    await user.type(screen.getByLabelText('Nombre'), 'Billiemoi');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/character/kelthuzad/billiemoi',
    );
  });

  it('encodes the segments when navigating', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Reino'), 'Area 52');
    await user.type(screen.getByLabelText('Nombre'), "D'arc");
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      `/character/area-52/${encodeURIComponent("d'arc")}`,
    );
  });

  it('shows field errors and does not navigate on invalid input', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Nombre'), 'billie moi');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    const realm = screen.getByLabelText('Reino');
    const name = screen.getByLabelText('Nombre');

    expect(realm).toHaveAttribute('aria-invalid', 'true');
    expect(realm).toHaveAccessibleDescription('Escribe el reino.');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription(/sin espacios/);
    expect(realm).toHaveFocus();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('clears a field error when the field changes', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    const realm = screen.getByLabelText('Reino');
    expect(realm).toHaveAttribute('aria-invalid', 'true');

    await user.type(realm, 'g');
    expect(realm).toHaveAttribute('aria-invalid', 'false');
    expect(realm).not.toHaveAttribute('aria-describedby');
  });
});
