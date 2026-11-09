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
      <AppHeader showAuthAction={showAuthAction} />
      <main className="page">
        <div className="container">{children}</div>
      </main>
      <AppFooter />
    </div>
  );
}
