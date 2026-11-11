import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="WoW Armory, volver al inicio">
      <span className="brand-mark" aria-hidden="true">
        <Icon name="sword" size={18} />
      </span>
      <span className="brand-text">
        WoW <span>Armory</span>
      </span>
    </Link>
  );
}
