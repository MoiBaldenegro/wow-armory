import type { Character } from '../../../domain/character/Character';

interface CharacterHeroProps {
  character: Character;
}

function initialsOf(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || '?';
}

export function CharacterHero({ character }: CharacterHeroProps) {
  const summary = [
    character.race,
    character.specialization,
    character.characterClass,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  return (
    <section className="character-hero fade-in" aria-labelledby="character-name">
      <div className="character-hero-accent" aria-hidden="true" />
      <div className="character-hero-body">
        <div className="avatar" aria-hidden="true">
          {initialsOf(character.name)}
        </div>
        <div>
          <p className="eyebrow">Ficha de personaje</p>
          <h1 id="character-name">{character.name}</h1>
          <p className="character-summary">{summary}</p>
        </div>
      </div>
    </section>
  );
}
