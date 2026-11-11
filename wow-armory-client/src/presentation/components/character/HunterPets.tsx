import type { HunterPet } from '../../../domain/armory/Armory';
import { useArmoryResource } from '../../hooks/useArmoryResource';
import { ArmorySection } from '../armory/ArmorySection';
import { Icon } from '../ui/Icon';
import type { CharacterSectionProps } from './sectionProps';

interface HunterPetsProps extends CharacterSectionProps {
  characterClass: string;
}

const HUNTER_CLASS = /^(hunter|cazador|cazadora)$/i;

export function HunterPets({ realmSlug, characterName, mode, characterClass }: HunterPetsProps) {
  const state = useArmoryResource<HunterPet[]>(
    HUNTER_CLASS.test(characterClass) ? `${mode}/${realmSlug}/${characterName}` : null,
    (armory) => armory.hunterPets(realmSlug, characterName, mode),
  );

  return (
    <ArmorySection id="character-pets-title" title="Mascotas de cazador" icon="heart" state={state}>
      {(pets) => (
        <ul className="pet-list">
          {pets.map((pet) => (
            <li key={`${pet.slot ?? ''}-${pet.name}`} className="pet-item">
              {pet.imageUrl ? (
                <img src={pet.imageUrl} alt="" loading="lazy" className="pet-image" />
              ) : (
                <span className="item-placeholder" aria-hidden="true">
                  <Icon name="heart" size={18} />
                </span>
              )}
              <div>
                <p className="pet-name">
                  {pet.name}
                  {pet.active && <span className="mx-badge">Activa</span>}
                </p>
                <p className="mx-text--secondary">
                  {[pet.creature, pet.level !== undefined ? `Nivel ${pet.level}` : undefined]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ArmorySection>
  );
}
