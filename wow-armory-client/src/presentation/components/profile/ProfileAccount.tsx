import type { AuthUser } from '../../providers/auth-context';
import { Icon } from '../ui/Icon';
import { ProfileValue } from './ProfileValue';

interface ProfileAccountProps {
  user?: AuthUser;
  isLoading: boolean;
  onLogout: () => Promise<void>;
}

export function ProfileAccount({
  user,
  isLoading,
  onLogout,
}: ProfileAccountProps) {
  return (
    <div>
      <div className="profile-grid">
        <ProfileValue label="BattleTag">
          {user?.battletag ?? 'Battle.net conectado'}
        </ProfileValue>
        <ProfileValue label="ID de cuenta">
          {user?.accountId ?? 'No proporcionado por Battle.net'}
        </ProfileValue>
      </div>

      <p className="session-badge">
        <Icon name="shield" size={15} />
        Sesión activa
      </p>

      <div className="profile-actions">
        <button
          type="button"
          onClick={() => void onLogout()}
          disabled={isLoading}
          aria-busy={isLoading}
          className="btn btn-ghost"
        >
          {isLoading ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </div>
    </div>
  );
}
