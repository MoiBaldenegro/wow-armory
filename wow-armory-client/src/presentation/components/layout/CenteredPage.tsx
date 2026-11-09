import type { ReactNode } from 'react';

interface CenteredPageProps {
  children: ReactNode;
}

export function CenteredPage({ children }: CenteredPageProps) {
  return <main className="centered-page">{children}</main>;
}
