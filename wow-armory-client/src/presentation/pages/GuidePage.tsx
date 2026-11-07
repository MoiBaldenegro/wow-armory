import { BookOpen, Globe2, Search, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header/Header';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  WarcraftCard,
  WarcraftCardContent,
  WarcraftCardHeader,
} from '../components/warcraftcn/WarcraftCard';

const regions = [
  ['us', 'Américas'],
  ['eu', 'Europa'],
  ['kr', 'Corea'],
  ['tw', 'Taiwán'],
];

export function GuidePage() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-white">
      <Header />
      <ThemeToggle />
      <main className="container mx-auto max-w-5xl px-4 py-8 pt-24">
        <section className="mb-8 rounded-2xl border-4 border-black bg-slate-950 p-8 text-white shadow-[8px_8px_0px_0px_rgba(245,158,11,0.65)] dark:border-white">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">
            Guía de Armory
          </p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Encuentra al héroe correcto
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Usa el slug del reino y el nombre exacto del personaje. Elige
            Classic o Retail para consultar el catálogo correspondiente.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-3">
          <GuideCard icon={<Search />} title="Formato de búsqueda">
            <code className="rounded bg-slate-200 px-2 py-1 text-sm dark:bg-slate-800">
              reino / nombre
            </code>
            <p className="mt-3">
              Ejemplo: <strong>grobbulus / Billiemoi</strong>. El reino se
              convierte automáticamente a slug.
            </p>
          </GuideCard>
          <GuideCard icon={<Globe2 />} title="Regiones">
            <ul className="space-y-2">
              {regions.map(([code, label]) => (
                <li key={code} className="flex justify-between">
                  <span>{label}</span>
                  <code>{code}</code>
                </li>
              ))}
            </ul>
          </GuideCard>
          <GuideCard icon={<ShieldCheck />} title="Versiones">
            <p>
              Classic usa el namespace configurado para Classic. Retail está
              separado para evitar mezclar personajes y reinos.
            </p>
          </GuideCard>
        </div>

        <section className="mt-8 rounded-2xl border-2 border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-amber-500" aria-hidden="true" />
            <h2 className="text-2xl font-black">Qué muestra la ficha</h2>
          </div>
          <div className="mt-5 grid gap-3 text-slate-700 sm:grid-cols-2 dark:text-slate-300">
            <p>• Nivel, clase, raza y especialización</p>
            <p>• Nivel de objeto y puntos de logro</p>
            <p>• Hermandad y última conexión</p>
            <p>• Logros recientes disponibles</p>
          </div>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-lg bg-amber-400 px-4 py-2 font-bold text-slate-950 hover:bg-amber-300"
          >
            Buscar un personaje
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function GuideCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <WarcraftCard size="sm">
      <WarcraftCardHeader>
        <div className="flex items-center gap-3 text-amber-400">
          {icon}
          <h2 className="text-xl font-black">{title}</h2>
        </div>
      </WarcraftCardHeader>
      <WarcraftCardContent>
        <div className="text-amber-50/80">{children}</div>
      </WarcraftCardContent>
    </WarcraftCard>
  );
}
