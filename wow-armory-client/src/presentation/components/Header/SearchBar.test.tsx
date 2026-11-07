import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SearchBar } from './SearchBar';

function LocationDisplay() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
}

function renderSearchBar() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <SearchBar isCompact={false} />
      <Routes>
        <Route path="/" element={null} />
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SearchBar', () => {
  it('is a search form with a Spanish realm/name placeholder', () => {
    renderSearchBar();

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Buscar personaje' }),
    ).toHaveAttribute('placeholder', 'Buscar: reino/nombre');
  });

  it('navigates to the character route on Enter', async () => {
    const user = userEvent.setup();
    renderSearchBar();

    await user.type(
      screen.getByRole('textbox', { name: 'Buscar personaje' }),
      'Grobbulus/Billiemoi{Enter}',
    );

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/character/grobbulus/billiemoi',
    );
  });

  it('shows an accessible error and does not navigate on invalid input', async () => {
    const user = userEvent.setup();
    renderSearchBar();

    const input = screen.getByRole('textbox', { name: 'Buscar personaje' });
    await user.type(input, 'billiemoi{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Usa el formato reino/nombre',
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/Usa el formato reino\/nombre/);
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('reports invalid field formats inside the query', async () => {
    const user = userEvent.setup();
    renderSearchBar();

    await user.type(
      screen.getByRole('textbox', { name: 'Buscar personaje' }),
      'grobbulus/billie moi{Enter}',
    );

    expect(screen.getByRole('alert')).toHaveTextContent('sin espacios');
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });
});
