import { Link } from 'react-router-dom';
import type { Character } from '../../../domain/character/Character';

interface CharacterHeroProps {
  character: Character;
  headingLevel?: 1 | 2;
  /** When set, the name and a button link to the full character page. */
  detailHref?: string;
}

function initialsOf(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || '?';
}

export function CharacterHero({
  character,
  headingLevel = 1,
  detailHref,
}: CharacterHeroProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
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
          <p className="mx-kicker">Ficha de personaje</p>
          <Heading id="character-name">
            {detailHref ? (
              <Link className="character-hero-link" to={detailHref}>
                {character.name}
              </Link>
            ) : (
              character.name
            )}
          </Heading>
          <p className="character-summary">{summary}</p>
        </div>
        {detailHref && (
          <Link
            className="mx-button mx-button--accent character-hero-action"
            to={detailHref}
          >
            Ver ficha completa
            <span className="mx-visually-hidden"> de {character.name}</span>
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </section>
  );
}
