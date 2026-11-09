import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
  error?: string;
  errorId?: string;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  children,
  error,
  errorId,
  className,
}: FormFieldProps) {
  return (
    <div className={`field${className ? ` ${className}` : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error !== undefined && (
        <p id={errorId} className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
