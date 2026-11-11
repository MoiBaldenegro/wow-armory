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
    <div className={`mx-field${className ? ` ${className}` : ''}`}>
      <label className="mx-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error !== undefined && (
        <p id={errorId} className="mx-field__error">
          {error}
        </p>
      )}
    </div>
  );
}
