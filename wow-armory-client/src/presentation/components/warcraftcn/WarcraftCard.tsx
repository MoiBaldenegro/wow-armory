import type { HTMLAttributes, ReactNode } from 'react';

interface WarcraftCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  size?: 'default' | 'sm';
}

export function WarcraftCard({
  children,
  className = '',
  size = 'default',
  ...props
}: WarcraftCardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={`fantasy wc-card ${size === 'sm' ? 'wc-card-sm' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function WarcraftCardHeader({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`wc-card-header ${className}`} {...props}>
      {children}
    </div>
  );
}

export function WarcraftCardContent({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`wc-card-content ${className}`} {...props}>
      {children}
    </div>
  );
}
