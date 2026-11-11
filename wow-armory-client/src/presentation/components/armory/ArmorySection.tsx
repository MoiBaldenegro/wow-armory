import type { ReactNode } from 'react';
import type { ArmoryResourceState } from '../../hooks/useArmoryResource';
import { ErrorAlert } from '../ui/ErrorAlert';
import type { IconName } from '../ui/Icon';
import { SectionHeading } from '../ui/SectionHeading';

interface ArmorySectionProps<T> {
  id: string;
  title: string;
  icon?: IconName;
  state: ArmoryResourceState<T> & { retry: () => void };
  /** Hide the whole section when the resource does not apply. */
  hideWhenEmpty?: boolean;
  emptyMessage?: string;
  children: (data: T) => ReactNode;
}

/** Card with loading, empty, rate limited and error states for a resource. */
export function ArmorySection<T>({
  id,
  title,
  icon,
  state,
  hideWhenEmpty = true,
  emptyMessage = 'Sin datos disponibles.',
  children,
}: ArmorySectionProps<T>) {
  if (state.status === 'disabled' || (state.status === 'empty' && hideWhenEmpty)) {
    return null;
  }

  return (
    <section className="card card-pad armory-section fade-in" aria-labelledby={id}>
      <SectionHeading id={id} icon={icon}>
        {title}
      </SectionHeading>
      {state.status === 'loading' && (
        <p role="status" className="status-text">
          Cargando…
        </p>
      )}
      {state.status === 'empty' && <p className="empty-state">{emptyMessage}</p>}
      {(state.status === 'error' || state.status === 'rate-limited') && (
        <div className="armory-error">
          <ErrorAlert>
            {state.status === 'rate-limited'
              ? 'Demasiadas consultas a Blizzard. Inténtalo en unos segundos.'
              : 'No se pudo cargar esta sección.'}
          </ErrorAlert>
          <button type="button" className="btn btn-ghost btn-sm" onClick={state.retry}>
            Reintentar
          </button>
        </div>
      )}
      {state.status === 'success' && children(state.data)}
    </section>
  );
}
