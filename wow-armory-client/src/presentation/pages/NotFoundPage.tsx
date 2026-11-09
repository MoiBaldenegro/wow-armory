import { Link } from 'react-router-dom';
import { CenteredPage } from '../components/layout/CenteredPage';
import { Icon } from '../components/ui/Icon';

export function NotFoundPage() {
  return (
    <CenteredPage>
      <div className="card centered-card fade-in">
        <span className="feature-icon" aria-hidden="true">
          <Icon name="search" size={22} />
        </span>
        <h1>Página no encontrada</h1>
        <p className="lead">
          La página que buscas no existe o se ha movido.
        </p>
        <div className="centered-actions">
          <Link to="/" className="btn btn-primary">
            Volver al inicio
          </Link>
        </div>
      </div>
    </CenteredPage>
  );
}
