import type { ReactNode } from 'react';

interface ErrorAlertProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function ErrorAlert({ children, className, id }: ErrorAlertProps) {
  return (
    <p
      id={id}
      role="alert"
      className={`mx-alert mx-alert--error${className ? ` ${className}` : ''}`}
    >
      {children}
    </p>
  );
}
