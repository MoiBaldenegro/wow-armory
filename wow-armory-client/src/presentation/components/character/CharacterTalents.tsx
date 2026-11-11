import { useState } from 'react';
import type { CharacterTalents as Talents } from '../../../domain/armory/Armory';
import { useArmoryResource } from '../../hooks/useArmoryResource';
import { ArmorySection } from '../armory/ArmorySection';
import type { CharacterSectionProps } from './sectionProps';

const TREE_LABELS: Record<string, string> = {
  class: 'Talentos de clase',
  hero: 'Talentos de héroe',
};

function TalentsView({ data }: { data: Talents }) {
  const initial = Math.max(
    0,
    data.groups.findIndex((group) => group.active),
  );
  const [selected, setSelected] = useState(initial);
  const group = data.groups[selected] ?? data.groups[0];
  const summary = (index: number) => {
    const item = data.groups[index];
    const points = item.trees.map((tree) => tree.points);
    return (
      item.name ??
      (points.every((value) => value !== undefined)
        ? points.join(' / ')
        : `Grupo ${index + 1}`)
    );
  };

  return (
    <div className="talents">
      {data.groups.length > 1 && (
        <div className="mx-segmented" role="group" aria-label="Grupo de talentos">
          {data.groups.map((item, index) => (
            <button
              key={index}
              type="button"
              className="mx-segmented__option"
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
            >
              {summary(index)}
              {item.active ? ' · activo' : ''}
            </button>
          ))}
        </div>
      )}
      <div className="talent-trees">
        {group.trees.map((tree) => (
          <div key={tree.name} className="talent-tree">
            <h3>
              {TREE_LABELS[tree.name] ?? tree.name}
              {tree.points !== undefined && (
                <span className="talent-points">{tree.points} pts</span>
              )}
            </h3>
            {tree.talents.length ? (
              <ul>
                {tree.talents.map((talent) => (
                  <li key={talent.name} title={talent.description}>
                    <span>{talent.name}</span>
                    {talent.rank !== undefined && (
                      <span className="talent-rank">{talent.rank}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mx-text--secondary">Sin talentos en este árbol.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CharacterTalents({ realmSlug, characterName, mode }: CharacterSectionProps) {
  const state = useArmoryResource<Talents>(
    `${mode}/${realmSlug}/${characterName}`,
    (armory) => armory.talents(realmSlug, characterName, mode),
    (value) => value.groups.every((group) => group.trees.length === 0),
  );

  return (
    <ArmorySection id="character-talents-title" title="Talentos" icon="book" state={state}>
      {(data) => <TalentsView data={data} />}
    </ArmorySection>
  );
}
