import { Icon } from '../ui/Icon';

export function ProfileHeader() {
  return (
    <div className="profile-header">
      <div className="profile-identity">
        <div className="profile-avatar" aria-hidden="true">
          <Icon name="user" size={30} />
        </div>
        <div>
          <p className="eyebrow">Battle.net conectado</p>
          <h1 className="page-title">Mi perfil</h1>
        </div>
      </div>
      <p className="lead">
        Tu identidad de Battle.net aparece aquí después del inicio de sesión.
        Tus personajes se consultan desde tu cuenta.
      </p>
    </div>
  );
}
