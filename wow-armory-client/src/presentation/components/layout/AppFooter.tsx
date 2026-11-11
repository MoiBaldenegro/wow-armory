import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { Brand } from './Brand';

export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mx-footer">
      <div className="mx-footer__inner">
        <div className="mx-footer-brand">
          <Brand />
          <p className="mx-footer-brand__headline">
            Consulta personajes, equipamiento, hermandades y logros de World of
            Warcraft en un solo lugar.
          </p>
          <p className="mx-footer-brand__location">
            <span aria-hidden="true">◉</span> Datos de Battle.net
          </p>
        </div>
        <nav className="mx-footer__column" aria-label="Navegación del pie">
          <h2 className="mx-label">Navegación</h2>
          <ul className="mx-link-list">
            <li>
              <Link className="mx-link mx-link--subtle" to="/">
                Inicio
              </Link>
            </li>
            <li>
              <Link className="mx-link mx-link--subtle" to="/guide">
                Guía de Armory
              </Link>
            </li>
            <li>
              <Link className="mx-link mx-link--subtle" to="/leaderboards">
                Clasificación de arena
              </Link>
            </li>
            <li>
              <Link className="mx-link mx-link--subtle" to="/profile">
                Mi perfil
              </Link>
            </li>
          </ul>
        </nav>
        <section className="mx-footer__column" aria-labelledby="footer-status-title">
          <h2 className="mx-label" id="footer-status-title">
            Estado
          </h2>
          <p className="mx-text mx-text--secondary">
            Datos servidos a través de Battle.net. Inicia sesión para consultar
            los personajes de tu cuenta.
          </p>
        </section>
      </div>
      <div className="mx-footer-bar">
        <p>© {currentYear} WoW Armory. Todos los derechos reservados.</p>
        <p>
          Hecho con <Icon className="heart" name="heart" size={13} /> por{' '}
          <strong>Moi Baldenegro</strong> · Diseño MXVI
        </p>
      </div>
    </footer>
  );
}
