import { useId } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PvpLeaderboard, WowMode } from '../../domain/armory/Armory';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { PageShell } from '../components/layout/PageShell';
import { useArmoryResource } from '../hooks/useArmoryResource';
import {
  bracketLabel,
  bracketsFor,
  factionLabel,
  winRate,
} from '../utils/armoryFormat';

export function LeaderboardsPage() {
  const modeId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: WowMode = searchParams.get('mode') === 'retail' ? 'retail' : 'classic';
  const brackets = bracketsFor(mode);
  const requested = searchParams.get('bracket') ?? '';
  const bracket = brackets.includes(requested) ? requested : brackets[1];
  const regionParam = searchParams.get('region');
  const region = regionParam && /^\d+$/.test(regionParam) ? Number(regionParam) : undefined;
  const state = useArmoryResource<PvpLeaderboard>(
    `${mode}/${bracket}/${region ?? ''}`,
    (armory) => armory.pvpLeaderboard(bracket, mode, region),
    (value) => value.entries.length === 0,
  );

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setSearchParams(next);
  };

  return (
    <PageShell>
      <header className="page-section">
        <p className="mx-kicker">JcJ</p>
        <h1 className="mx-heading mx-heading--display">Clasificación de arena</h1>
        <p className="mx-text mx-text--lead">Top 100 de la temporada actual según Blizzard.</p>
      </header>

      <div className="mx-card leaderboard-controls">
        <div className="mx-segmented" role="group" aria-label="Modalidad">
          {brackets.map((item) => (
            <button
              key={item}
              type="button"
              className="mx-segmented__option"
              aria-pressed={item === bracket}
              onClick={() => update({ bracket: item })}
            >
              {bracketLabel(item)}
            </button>
          ))}
        </div>
        <div className="mx-field">
          <label className="mx-field__label" htmlFor={modeId}>Juego</label>
          <select
            id={modeId}
            className="mx-input mx-select"
            value={mode}
            onChange={(event) =>
              update({ mode: event.target.value, bracket: undefined, region: undefined })
            }
          >
            <option value="classic">Classic</option>
            <option value="retail">Retail</option>
          </select>
        </div>
        {state.status === 'success' && state.data.pvpRegions.length > 1 && (
          <div className="mx-segmented" role="group" aria-label="Región JcJ">
            {state.data.pvpRegions.map((id) => (
              <button
                key={id}
                type="button"
                className="mx-segmented__option"
                aria-pressed={id === state.data.pvpRegionId}
                onClick={() => update({ region: String(id) })}
              >
                Región {id}
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="mx-card" aria-labelledby="leaderboard-title">
        <h2 id="leaderboard-title" className="mx-card__title">
          {bracketLabel(bracket)}
          {state.status === 'success' ? ` · Temporada ${state.data.seasonId}` : ''}
        </h2>
        {state.status === 'loading' && (
          <p role="status" className="mx-status">
            Cargando clasificación…
          </p>
        )}
        {state.status === 'empty' && (
          <p className="mx-text mx-text--secondary">No hay clasificación disponible para esta modalidad.</p>
        )}
        {(state.status === 'error' || state.status === 'rate-limited') && (
          <div className="armory-error">
            <ErrorAlert>
              {state.status === 'rate-limited'
                ? 'Demasiadas consultas a Blizzard. Inténtalo en unos segundos.'
                : 'No se pudo cargar la clasificación.'}
            </ErrorAlert>
            <button type="button" className="mx-button mx-button--sm" onClick={state.retry}>
              Reintentar
            </button>
          </div>
        )}
        {state.status === 'success' && (
          <div className="mx-table-wrap">
            <table className="mx-table">
              <caption className="mx-visually-hidden">Clasificación {bracketLabel(bracket)}</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Personaje</th>
                  <th scope="col">Índice</th>
                  <th scope="col">G-P</th>
                  <th scope="col">% victorias</th>
                  <th scope="col">Facción</th>
                </tr>
              </thead>
              <tbody>
                {state.data.entries.map((entry) => (
                  <tr key={`${entry.rank}-${entry.realmSlug ?? ''}-${entry.name}`}>
                    <td>{entry.rank}</td>
                    <th scope="row">
                      {entry.realmSlug ? (
                        <Link
                          className="mx-link"
                          to={`/character/${encodeURIComponent(entry.realmSlug)}/${encodeURIComponent(
                            entry.name.toLowerCase(),
                          )}?mode=${mode}`}
                        >
                          {entry.name}
                        </Link>
                      ) : (
                        entry.name
                      )}
                      {entry.realmSlug && <span className="mx-text--secondary"> · {entry.realmSlug}</span>}
                    </th>
                    <td>{entry.rating ?? '—'}</td>
                    <td>
                      {entry.won !== undefined ? `${entry.won}-${entry.lost ?? 0}` : '—'}
                    </td>
                    <td>{winRate(entry.won, entry.lost) ?? '—'}</td>
                    <td>{factionLabel(entry.faction) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
