import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';

export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h2 className="footer-title">WoW Armory</h2>
            <p className="footer-copy">
              Consulta personajes, equipamiento, hermandades y logros de World
              of Warcraft en un solo lugar.
            </p>
          </div>
          <div>
            <h2 className="footer-title">Navegación</h2>
            <nav className="footer-nav" aria-label="Navegación del pie">
              <Link to="/">Inicio</Link>
              <Link to="/guide">Guía de Armory</Link>
              <Link to="/leaderboards">Clasificación de arena</Link>
              <Link to="/profile">Mi perfil</Link>
            </nav>
          </div>
          <div>
            <h2 className="footer-title">Estado</h2>
            <p className="footer-copy">
              Datos servidos a través de Battle.net. Inicia sesión para
              consultar los personajes de tu cuenta.
            </p>
          </div>
        </div>
        <div className="footer-meta">
          <p>© {currentYear} WoW Armory. Todos los derechos reservados.</p>
          <p>
            Hecho con <Icon className="heart" name="heart" size={14} /> por{' '}
            <strong>Moi Baldenegro</strong>
          </p>
        </div>
      </div>
    </footer>
  );
}
