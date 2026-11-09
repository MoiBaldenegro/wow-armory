import type { CharacterEquipmentItem } from '../../../domain/character/CharacterDetails';
import { Icon } from '../ui/Icon';
import { SectionHeading } from '../ui/SectionHeading';

interface CharacterEquipmentProps {
  equipment: CharacterEquipmentItem[];
}

export function CharacterEquipment({ equipment }: CharacterEquipmentProps) {
  return (
    <section
      className="card card-pad equipment-section"
      aria-labelledby="character-equipment-title"
    >
      <SectionHeading id="character-equipment-title">
        Equipamiento
      </SectionHeading>
      <ul className="equipment-grid">
        {equipment.map((item) => (
          <li className="equipment-item" key={`${item.slot}-${item.name}`}>
            {item.iconUrl ? (
              <img
                src={item.iconUrl}
                alt=""
                className="item-icon"
                loading="lazy"
              />
            ) : (
              <span className="item-placeholder" aria-hidden="true">
                <Icon name="shield" size={18} />
              </span>
            )}
            <div className="item-body">
              <p>{item.name}</p>
              <p>
                {item.slot}
                {item.level !== undefined ? ` · Nivel ${item.level}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
