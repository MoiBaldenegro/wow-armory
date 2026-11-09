import { Link, useSearchParams } from 'react-router-dom';
import { CenteredPage } from '../components/layout/CenteredPage';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Icon } from '../components/ui/Icon';
import { resolveAuthErrorMessage } from '../utils/authErrorMessages';

export function ErrorPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('auth_error') ?? searchParams.get('code');
  const message = resolveAuthErrorMessage(code);

  return (
    <CenteredPage>
      <div className="card centered-card fade-in">
        <span className="feature-icon" aria-hidden="true">
          <Icon name="alert" size={22} />
        </span>
        <h1>Algo salió mal</h1>
        <ErrorAlert>{message}</ErrorAlert>
        {code && (
          <p className="error-code">
            Código de error: <code>{code}</code>
          </p>
        )}
        <div className="centered-actions">
          <Link to="/" className="btn btn-primary">
            Volver al inicio
          </Link>
        </div>
      </div>
    </CenteredPage>
  );
}
