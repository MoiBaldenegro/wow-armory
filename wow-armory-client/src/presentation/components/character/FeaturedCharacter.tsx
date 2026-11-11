import { Link } from 'react-router-dom';
import { FEATURED_CHARACTER } from '../../data/featuredCharacter';
import { useCharacter } from '../../hooks/useCharacter';
import { useCharacterDetails } from '../../hooks/useCharacterDetails';
import { CharacterProfileContent } from './CharacterProfileContent';

const href = `/character/${FEATURED_CHARACTER.realmSlug}/${FEATURED_CHARACTER.characterName}?mode=${FEATURED_CHARACTER.mode}`;

export function FeaturedCharacter() {
  const { state, retry } = useCharacter(
    FEATURED_CHARACTER.realmSlug,
    FEATURED_CHARACTER.characterName,
    FEATURED_CHARACTER.mode,
  );
  const details = useCharacterDetails(
    FEATURED_CHARACTER.realmSlug,
    FEATURED_CHARACTER.characterName,
    FEATURED_CHARACTER.mode,
  );

  if (state.status === 'loading') {
    return (
      <section
        className="mx-card featured-profile"
        aria-labelledby="featured-profile-title"
      >
        <p className="mx-kicker" id="featured-profile-title">
          Personaje destacado
        </p>
        <p role="status" className="mx-status">
          Cargando personaje destacado…
        </p>
      </section>
    );
  }

  if (state.status !== 'success') {
    return (
      <section
        className="mx-card featured-profile"
        aria-labelledby="featured-profile-title"
      >
        <p className="mx-kicker" id="featured-profile-title">
          Personaje destacado
        </p>
        <h2>{FEATURED_CHARACTER.displayName}</h2>
        <p className="mx-text mx-text--lead">
          No pudimos cargar la ficha de {FEATURED_CHARACTER.realmName} ahora
          mismo.
        </p>
        <div className="centered-actions">
          <button type="button" className="mx-button" onClick={retry}>
            Reintentar
          </button>
          <Link to={href} className="mx-button mx-button--accent">
            Abrir ficha
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="featured-profile" aria-label="Personaje destacado">
      <CharacterProfileContent
        state={state}
        realmSlug={FEATURED_CHARACTER.realmSlug}
        characterName={FEATURED_CHARACTER.characterName}
        retry={retry}
        details={details}
        headingLevel={2}
        mode={FEATURED_CHARACTER.mode}
        detailHref={href}
        compact
      />
    </section>
  );
}
