import { Link } from 'react-router-dom';
import { FeaturedCharacter } from '../components/character/FeaturedCharacter';
import { AuthErrorAlert } from '../components/feedback/AuthErrorAlert';
import { PageShell } from '../components/layout/PageShell';
import { CharacterSearchForm } from '../components/search/CharacterSearchForm';
import { Icon } from '../components/ui/Icon';
import { FEATURED_CHARACTER } from '../data/featuredCharacter';
import { useAuth } from '../hooks/useAuth';

const features = [
  {
    icon: 'shield' as const,
    title: 'Ficha completa',
    description:
      'Nivel, raza, clase, especialización, nivel de objeto y última conexión.',
  },
  {
    icon: 'users' as const,
    title: 'Hermandad y equipo',
    description:
      'Consulta la hermandad, el rango y el equipamiento del personaje.',
  },
  {
    icon: 'trophy' as const,
    title: 'Logros recientes',
    description:
      'Revisa los logros más recientes y los puntos de logro acumulados.',
  },
];

export function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <PageShell>
      <AuthErrorAlert />

      <section className="hero">
        <div className="hero-copy">
          <p className="mx-kicker">Armory de Azeroth</p>
          <h1 id="home-title" className="mx-heading mx-heading--display">
            Busca un personaje
          </h1>
          <p className="mx-text mx-text--lead">
            Escribe el reino y el nombre para ver su nivel, hermandad,
            equipamiento y logros recientes.
          </p>
        </div>
        <div className="mx-card hero-panel">
          <CharacterSearchForm
            initialRealm={FEATURED_CHARACTER.realmName}
            initialName={FEATURED_CHARACTER.displayName}
            initialMode={FEATURED_CHARACTER.mode}
          />
        </div>
      </section>

      <FeaturedCharacter />

      {isAuthenticated && (
        <section className="mx-card account-strip">
          <div>
            <p className="mx-kicker">Cuenta conectada</p>
            <h2>
              {user?.battletag ??
                (user?.accountId
                  ? `Cuenta ${user.accountId}`
                  : 'Jugador de Battle.net')}
            </h2>
            <p>
              Busca personajes o revisa los personajes vinculados a tu cuenta.
            </p>
          </div>
          <Link to="/profile" className="mx-button mx-button--accent">
            Ver mi perfil
          </Link>
        </section>
      )}

      <div className="feature-grid">
        {features.map((feature) => (
          <section className="mx-card feature" key={feature.title}>
            <span className="feature-icon" aria-hidden="true">
              <Icon name={feature.icon} size={20} />
            </span>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
