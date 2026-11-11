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
        <p className="eyebrow">JcJ</p>
        <h1 className="page-title">Clasificación de arena</h1>
        <p className="lead">Top 100 de la temporada actual según Blizzard.</p>
      </header>

      <div className="card card-pad leaderboard-controls">
        <div className="segmented" role="group" aria-label="Modalidad">
          {brackets.map((item) => (
            <button
              key={item}
              type="button"
              className="segmented-option"
              aria-pressed={item === bracket}
              onClick={() => update({ bracket: item })}
            >
              {bracketLabel(item)}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor={modeId}>Juego</label>
          <select
            id={modeId}
            className="select"
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
          <div className="segmented" role="group" aria-label="Región JcJ">
            {state.data.pvpRegions.map((id) => (
              <button
                key={id}
                type="button"
                className="segmented-option"
                aria-pressed={id === state.data.pvpRegionId}
                onClick={() => update({ region: String(id) })}
              >
                Región {id}
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="card card-pad" aria-labelledby="leaderboard-title">
        <h2 id="leaderboard-title" className="section-title">
          {bracketLabel(bracket)}
          {state.status === 'success' ? ` · Temporada ${state.data.seasonId}` : ''}
        </h2>
        {state.status === 'loading' && (
          <p role="status" className="status-text">
            Cargando clasificación…
          </p>
        )}
        {state.status === 'empty' && (
          <p className="empty-state">No hay clasificación disponible para esta modalidad.</p>
        )}
        {(state.status === 'error' || state.status === 'rate-limited') && (
          <div className="armory-error">
            <ErrorAlert>
              {state.status === 'rate-limited'
                ? 'Demasiadas consultas a Blizzard. Inténtalo en unos segundos.'
                : 'No se pudo cargar la clasificación.'}
            </ErrorAlert>
            <button type="button" className="btn btn-ghost btn-sm" onClick={state.retry}>
              Reintentar
            </button>
          </div>
        )}
        {state.status === 'success' && (
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">Clasificación {bracketLabel(bracket)}</caption>
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
                          className="text-link"
                          to={`/character/${encodeURIComponent(entry.realmSlug)}/${encodeURIComponent(
                            entry.name.toLowerCase(),
                          )}?mode=${mode}`}
                        >
                          {entry.name}
                        </Link>
                      ) : (
                        entry.name
                      )}
                      {entry.realmSlug && <span className="muted"> · {entry.realmSlug}</span>}
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
