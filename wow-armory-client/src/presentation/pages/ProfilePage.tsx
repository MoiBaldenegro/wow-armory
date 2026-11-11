import { useEffect, useState } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { ProfileAccount } from '../components/profile/ProfileAccount';
import { ProfileCharacters } from '../components/profile/ProfileCharacters';
import { ProfileGuest } from '../components/profile/ProfileGuest';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { useAuth } from '../hooks/useAuth';

export function ProfilePage() {
  const { isAuthenticated, isLoading, error, user, login, logout } = useAuth();
  const [hasCheckedSession, setHasCheckedSession] = useState(!isLoading);

  useEffect(() => {
    if (!isLoading) {
      setHasCheckedSession(true);
    }
  }, [isLoading]);

  return (
    <PageShell showAuthAction={false}>
      <section className="mx-card fade-in">
        <ProfileHeader />

        {error && <ErrorAlert className="profile-alert">{error}</ErrorAlert>}

        {!hasCheckedSession ? (
          <p role="status" className="mx-status profile-status">
            Cargando perfil…
          </p>
        ) : isAuthenticated ? (
          <div className="profile-body">
            <ProfileAccount
              user={user}
              isLoading={isLoading}
              onLogout={logout}
            />
            <ProfileCharacters enabled />
          </div>
        ) : (
          <div className="profile-body">
            <ProfileGuest isLoading={isLoading} onLogin={login} />
          </div>
        )}
      </section>
    </PageShell>
  );
}
