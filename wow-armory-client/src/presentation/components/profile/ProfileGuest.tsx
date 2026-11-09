interface ProfileGuestProps {
  isLoading: boolean;
  onLogin: () => Promise<void>;
}

export function ProfileGuest({ isLoading, onLogin }: ProfileGuestProps) {
  return (
    <div>
      <p className="lead">Inicia sesión con Battle.net para ver tu perfil.</p>
      <div className="profile-actions">
        <button
          type="button"
          onClick={() => void onLogin()}
          disabled={isLoading}
          aria-busy={isLoading}
          className="btn btn-primary"
        >
          {isLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </div>
    </div>
  );
}
