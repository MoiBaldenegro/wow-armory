import type { CharacterPvp as Pvp } from '../../../domain/armory/Armory';
import { useArmoryResource } from '../../hooks/useArmoryResource';
import { bracketLabel, winRate } from '../../utils/armoryFormat';
import { formatNumber } from '../../utils/characterFormat';
import { ArmorySection } from '../armory/ArmorySection';
import type { CharacterSectionProps } from './sectionProps';

export function CharacterPvp({ realmSlug, characterName, mode }: CharacterSectionProps) {
  const state = useArmoryResource<Pvp>(
    `${mode}/${realmSlug}/${characterName}`,
    (armory) => armory.pvp(realmSlug, characterName, mode),
    (value) =>
      value.brackets.length === 0 &&
      !value.honorableKills &&
      value.honorLevel === undefined,
  );

  return (
    <ArmorySection id="character-pvp-title" title="JcJ" icon="sword" state={state}>
      {(data) => (
        <div className="pvp">
          <dl className="mx-facts">
            {data.honorableKills !== undefined && (
              <div className="mx-fact">
                <dt>Muertes con honor</dt>
                <dd>{formatNumber(data.honorableKills)}</dd>
              </div>
            )}
            {data.honorLevel !== undefined && (
              <div className="mx-fact">
                <dt>Nivel de honor</dt>
                <dd>{formatNumber(data.honorLevel)}</dd>
              </div>
            )}
          </dl>
          {data.brackets.length > 0 && (
            <div className="mx-table-wrap">
              <table className="mx-table">
                <caption className="mx-visually-hidden">Brackets JcJ</caption>
                <thead>
                  <tr>
                    <th scope="col">Modalidad</th>
                    <th scope="col">Índice</th>
                    <th scope="col">Temporada (G-P)</th>
                    <th scope="col">% victorias</th>
                    <th scope="col">Semana (G-P)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.brackets.map((bracket) => (
                    <tr key={bracket.bracket}>
                      <th scope="row">{bracketLabel(bracket.bracket)}</th>
                      <td>{bracket.rating ?? '—'}</td>
                      <td>
                        {bracket.season
                          ? `${bracket.season.won}-${bracket.season.lost}`
                          : '—'}
                      </td>
                      <td>{winRate(bracket.season?.won, bracket.season?.lost) ?? '—'}</td>
                      <td>
                        {bracket.weekly
                          ? `${bracket.weekly.won}-${bracket.weekly.lost}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </ArmorySection>
  );
}
