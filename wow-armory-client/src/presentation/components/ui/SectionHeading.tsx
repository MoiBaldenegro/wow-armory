import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface SectionHeadingProps {
  id?: string;
  icon?: IconName;
  children: ReactNode;
}

export function SectionHeading({ id, icon, children }: SectionHeadingProps) {
  return (
    <h2 id={id} className="mx-card__title">
      {icon && <Icon name={icon} size={19} />}
      {children}
    </h2>
  );
}
