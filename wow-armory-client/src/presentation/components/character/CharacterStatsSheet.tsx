import type {
  CharacterStatistics,
  StatGroup,
} from '../../../domain/armory/Armory';
import { useArmoryResource } from '../../hooks/useArmoryResource';
import {
  formatStat,
  STAT_GROUP_LABELS,
  STAT_LABELS,
} from '../../utils/armoryFormat';
import { ArmorySection } from '../armory/ArmorySection';
import type { CharacterSectionProps } from './sectionProps';

const GROUP_ORDER: StatGroup[] = [
  'general',
  'attributes',
  'offense',
  'defense',
  'resistances',
];

export function CharacterStatsSheet({ realmSlug, characterName, mode }: CharacterSectionProps) {
  const state = useArmoryResource<CharacterStatistics>(
    `${mode}/${realmSlug}/${characterName}`,
    (armory) => armory.statistics(realmSlug, characterName, mode),
    (value) => value.stats.length === 0,
  );

  return (
    <ArmorySection id="character-statistics-title" title="Estadísticas" icon="heart" state={state}>
      {(data) => (
        <div className="stats-sheet">
          {GROUP_ORDER.map((group) => {
            const stats = data.stats.filter((stat) => stat.group === group);
            return stats.length ? (
              <div key={group} className="stats-group">
                <h3>{STAT_GROUP_LABELS[group]}</h3>
                <dl>
                  {stats.map((stat) => (
                    <div key={stat.key} className="stats-row">
                      <dt>
                        {stat.key === 'power' && data.powerType
                          ? data.powerType
                          : (STAT_LABELS[stat.key] ?? stat.key)}
                      </dt>
                      <dd>{formatStat(stat.value, stat.kind)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null;
          })}
        </div>
      )}
    </ArmorySection>
  );
}
