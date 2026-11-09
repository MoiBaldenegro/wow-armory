import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Icon, type IconName } from '../components/ui/Icon';

const regions = [
  ['us', 'Américas'],
  ['eu', 'Europa'],
  ['kr', 'Corea'],
  ['tw', 'Taiwán'],
];

const sheetItems = [
  'Nivel, clase, raza y especialización',
  'Nivel de objeto y puntos de logro',
  'Hermandad y última conexión',
  'Logros recientes disponibles',
  'Retrato y equipamiento del personaje',
];

export function GuidePage() {
  return (
    <PageShell>
      <section className="card guide-hero fade-in">
        <p className="eyebrow">Guía de Armory</p>
        <h1 className="page-title">Encuentra al héroe correcto</h1>
        <p className="lead">
          Usa el slug del reino y el nombre exacto del personaje. Elige Classic
          o Retail para consultar el catálogo correspondiente.
        </p>
      </section>

      <div className="guide-grid">
        <GuideCard icon="search" title="Formato de búsqueda">
          <code className="inline-code">reino / nombre</code>
          <p>
            Ejemplo: <strong>grobbulus / Billiemoi</strong>. El reino se
            convierte automáticamente a slug y el nombre a minúsculas.
          </p>
        </GuideCard>

        <GuideCard icon="globe" title="Regiones">
          <ul className="region-list">
            {regions.map(([code, label]) => (
              <li key={code}>
                <span>{label}</span>
                <code>{code}</code>
              </li>
            ))}
          </ul>
        </GuideCard>

        <GuideCard icon="shield" title="Versiones">
          <p>
            Classic usa el namespace configurado para Classic. Retail está
            separado para evitar mezclar personajes y reinos.
          </p>
        </GuideCard>
      </div>

      <section className="card card-pad page-section">
        <div className="guide-card-header">
          <Icon name="book" size={20} />
          <h2 className="section-title">Qué muestra la ficha</h2>
        </div>
        <ul className="checklist">
          {sheetItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="guide-cta">
          <Link to="/" className="btn btn-primary">
            Buscar un personaje
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

function GuideCard({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card guide-card">
      <div className="guide-card-header">
        <Icon name={icon} size={20} />
        <h2>{title}</h2>
      </div>
      <div className="guide-card-body">{children}</div>
    </section>
  );
}
