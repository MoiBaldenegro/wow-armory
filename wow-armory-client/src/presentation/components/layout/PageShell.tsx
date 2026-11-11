import type { ReactNode } from 'react';
import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';

interface PageShellProps {
  children: ReactNode;
  showAuthAction?: boolean;
}

export function PageShell({
  children,
  showAuthAction = true,
}: PageShellProps) {
  return (
    <div className="app-shell">
      <a className="mx-skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <AppHeader showAuthAction={showAuthAction} />
      <main className="mx-page app-page" id="contenido" tabIndex={-1}>
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
