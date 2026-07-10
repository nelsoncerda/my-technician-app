import React from 'react';
import { CalendarCheck, CheckCircle2, MapPin, Search, ShieldCheck, UserRoundCheck, Wrench } from 'lucide-react';
import { Button } from '../ui/button';

interface AboutViewProps {
  onBrowse: () => void;
  onJoin: () => void;
}

const AboutView: React.FC<AboutViewProps> = ({ onBrowse, onJoin }) => (
  <main className="bg-stone-50 text-slate-950">
    <section className="border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-200">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          Hecho en Santiago para el Cibao
        </span>
        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
          Conectamos necesidades reales con profesionales locales.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Técnicos en RD ayuda a encontrar, comparar y reservar servicios para el hogar con información clara y un proceso sencillo.
        </p>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="about-purpose-title">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Nuestro propósito</p>
          <h2 id="about-purpose-title" className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Menos incertidumbre. Más confianza para resolver.
          </h2>
          <p className="mt-5 leading-7 text-slate-600">
            Reunimos perfiles, especialidades, zonas de servicio y opiniones en un solo lugar. Así cada persona puede tomar una mejor decisión y cada técnico puede construir una reputación basada en su trabajo.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: ShieldCheck,
              title: 'Perfiles más claros',
              text: 'La verificación y las valoraciones ayudan a comparar con mayor seguridad.',
            },
            {
              icon: CalendarCheck,
              title: 'Reservas organizadas',
              text: 'La solicitud, el horario y el estado del servicio quedan reunidos en una sola agenda.',
            },
            {
              icon: UserRoundCheck,
              title: 'Talento local',
              text: 'Damos visibilidad a profesionales que conocen las necesidades de su comunidad.',
            },
            {
              icon: CheckCircle2,
              title: 'Información privada',
              text: 'Los datos de contacto se comparten dentro del flujo de una reserva.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="border-y border-stone-200 bg-white" aria-labelledby="about-flow-title">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Cómo funciona</p>
          <h2 id="about-flow-title" className="mt-2 text-3xl font-black tracking-tight">Un proceso simple de principio a fin</h2>
        </div>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: Search, title: 'Busca', text: 'Selecciona el servicio y la zona donde lo necesitas.' },
            { icon: Wrench, title: 'Compara', text: 'Revisa experiencia, especialidades, verificación y opiniones.' },
            { icon: CalendarCheck, title: 'Reserva', text: 'Elige un horario disponible y sigue el estado de la visita.' },
          ].map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="rounded-2xl bg-stone-50 p-6 ring-1 ring-stone-200">
              <div className="flex items-center justify-between">
                <Icon className="h-6 w-6 text-emerald-700" aria-hidden="true" />
                <span className="text-sm font-black text-stone-400">0{index + 1}</span>
              </div>
              <h3 className="mt-6 text-xl font-black">{title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>

    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-emerald-700 px-6 py-10 text-center text-white shadow-xl sm:px-10 sm:py-14">
        <h2 className="text-3xl font-black tracking-tight">¿Qué necesitas resolver hoy?</h2>
        <p className="mx-auto mt-3 max-w-xl text-emerald-100">Explora profesionales locales o crea una cuenta para administrar tus reservas.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={onBrowse} size="lg" className="bg-white text-emerald-800 hover:bg-emerald-50">
            Buscar técnicos
          </Button>
          <Button onClick={onJoin} size="lg" variant="outline" className="border-emerald-300 bg-transparent text-white hover:bg-emerald-600">
            Crear una cuenta
          </Button>
        </div>
      </div>
    </section>
  </main>
);

export default AboutView;
