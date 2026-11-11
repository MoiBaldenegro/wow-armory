import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '../ui/ErrorAlert';

interface ProblemCardProps {
  title: string;
  message: string;
  children?: ReactNode;
}

export function ProblemCard({ title, message, children }: ProblemCardProps) {
  return (
    <div className="mx-card problem-card fade-in">
      <h1>{title}</h1>
      <ErrorAlert>{message}</ErrorAlert>
      <div>{children}</div>
      <div className="problem-actions">
        <Link to="/" className="mx-link">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
