import React from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Car,
  CheckCircle2,
  Droplets,
  Hammer,
  KeyRound,
  LockKeyhole,
  MapPin,
  Paintbrush,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
  ShieldCheck,
  Snowflake,
  Star,
  UserCheck,
  WifiOff,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export interface HomeTechnicianReview {
  id: string;
  author: string;
  comment: string;
  rating: number;
  date: string;
}

export interface HomeTechnician {
  id: string;
  name: string;
  specialization: string;
  specializations?: string[];
  location: string;
  photoUrl?: string;
  rating: number;
  reviews: HomeTechnicianReview[];
  verified: boolean;
  companyName?: string;
}

export interface HomeUser {
  id: string;
  name: string;
  role: 'user' | 'technician' | 'admin';
}

export interface HomeViewProps {
  technicians: HomeTechnician[];
  filteredTechnicians: HomeTechnician[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedSpecialization: string;
  setSelectedSpecialization: (value: string) => void;
  selectedLocation: string;
  setSelectedLocation: (value: string) => void;
  specializations: string[];
  locations: string[];
  currentUser: HomeUser | null;
  onLoginRequired: () => void;
  onBook: (technician: HomeTechnician) => void;
  onReview: (technicianId: string) => void;
  hasCompletedBooking: (technicianId: string) => boolean;
  onRetry: () => void;
  onResetFilters: () => void;
}

const serviceIconFor = (service: string): LucideIcon => {
  const normalized = service
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('electric')) return Zap;
  if (normalized.includes('plom') || normalized.includes('agua')) return Droplets;
  if (normalized.includes('aire') || normalized.includes('refrig')) return Snowflake;
  if (normalized.includes('carpint') || normalized.includes('alban')) return Hammer;
  if (normalized.includes('cerraj')) return KeyRound;
  if (normalized.includes('pint')) return Paintbrush;
  if (normalized.includes('mecan')) return Car;
  return Wrench;
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const getTechnicianSpecializations = (technician: HomeTechnician) =>
  Array.from(
    new Set(
      [technician.specialization, ...(technician.specializations || [])].filter(Boolean)
    )
  );

interface TechnicianCardProps {
  technician: HomeTechnician;
  currentUser: HomeUser | null;
  onLoginRequired: () => void;
  onBook: (technician: HomeTechnician) => void;
  onReview: (technicianId: string) => void;
  canReview: boolean;
}

const TechnicianCard: React.FC<TechnicianCardProps> = ({
  technician,
  currentUser,
  onLoginRequired,
  onBook,
  onReview,
  canReview,
}) => {
  const reviewCount = technician.reviews?.length || 0;
  const rating = technician.rating || 0;
  const technicianSpecializations = getTechnicianSpecializations(technician);
  const visibleSpecializations = technicianSpecializations.slice(0, 2);
  const remainingSpecializations = technicianSpecializations.length - visibleSpecializations.length;

  const handleBooking = () => {
    if (!currentUser) {
      onLoginRequired();
      return;
    }
    onBook(technician);
  };

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2">
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 flex-none overflow-hidden rounded-2xl bg-emerald-100 ring-1 ring-emerald-200">
          {technician.photoUrl ? (
            <img
              src={technician.photoUrl}
              alt={`Foto de ${technician.name}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-emerald-800">
              {getInitials(technician.name)}
            </div>
          )}
          {technician.verified && (
            <span
              className="absolute bottom-1 right-1 rounded-full bg-white p-0.5 text-emerald-600 shadow-sm"
              title="Perfil verificado"
            >
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Perfil verificado</span>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-slate-950">
                {technician.name}
              </h3>
              {technician.companyName && (
                <p className="truncate text-sm text-slate-500">{technician.companyName}</p>
              )}
            </div>
            {technician.verified && (
              <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Verificado
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {rating > 0 ? (
              <span
                className="inline-flex items-center gap-1 font-semibold text-slate-800"
                aria-label={`${rating.toFixed(1)} de 5, ${reviewCount} ${
                  reviewCount === 1 ? 'reseña' : 'reseñas'
                }`}
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                {rating.toFixed(1)}
                <span className="font-normal text-slate-500">({reviewCount})</span>
              </span>
            ) : (
              <span className="text-sm font-medium text-slate-500">Perfil nuevo</span>
            )}
            <span className="inline-flex min-w-0 items-center gap-1 text-slate-600">
              <MapPin className="h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
              <span className="truncate">{technician.location}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Servicios ofrecidos">
        {visibleSpecializations.map((specialization) => (
          <span
            key={specialization}
            className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-slate-700"
          >
            {specialization}
          </span>
        ))}
        {remainingSpecializations > 0 && (
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-slate-500">
            +{remainingSpecializations} más
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
        {canReview && (
          <button
            type="button"
            onClick={() => onReview(technician.id)}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            aria-label={`Calificar a ${technician.name}`}
          >
            <Star className="h-4 w-4" aria-hidden="true" />
            Calificar
          </button>
        )}
        <button
          type="button"
          onClick={handleBooking}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          aria-label={`${currentUser ? 'Reservar servicio con' : 'Iniciar sesión para reservar con'} ${
            technician.name
          }`}
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {currentUser ? 'Reservar' : 'Entrar para reservar'}
        </button>
      </div>
    </article>
  );
};

const TechnicianSkeleton = () => (
  <div
    className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
    aria-hidden="true"
  >
    <div className="flex animate-pulse items-start gap-4 motion-reduce:animate-none">
      <div className="h-16 w-16 rounded-2xl bg-stone-200" />
      <div className="flex-1 space-y-3 pt-1">
        <div className="h-5 w-2/3 rounded bg-stone-200" />
        <div className="h-4 w-1/2 rounded bg-stone-100" />
        <div className="h-4 w-3/4 rounded bg-stone-100" />
      </div>
    </div>
    <div className="mt-5 flex animate-pulse gap-2 motion-reduce:animate-none">
      <div className="h-7 w-24 rounded-full bg-stone-100" />
      <div className="h-7 w-28 rounded-full bg-stone-100" />
    </div>
    <div className="mt-5 h-11 animate-pulse rounded-xl bg-stone-200 motion-reduce:animate-none" />
  </div>
);

const HomeView: React.FC<HomeViewProps> = ({
  technicians,
  filteredTechnicians,
  loading,
  error,
  searchTerm,
  setSearchTerm,
  selectedSpecialization,
  setSelectedSpecialization,
  selectedLocation,
  setSelectedLocation,
  specializations,
  locations,
  currentUser,
  onLoginRequired,
  onBook,
  onReview,
  hasCompletedBooking,
  onRetry,
  onResetFilters,
}) => {
  const verifiedCount = technicians.filter((technician) => technician.verified).length;
  const reviewCount = technicians.reduce(
    (total, technician) => total + (technician.reviews?.length || 0),
    0
  );
  const coveredLocations = new Set(
    technicians.map((technician) => technician.location).filter(Boolean)
  ).size;
  const activeFilters = Boolean(
    searchTerm.trim() || selectedSpecialization || selectedLocation
  );
  const featuredServices = specializations.slice(0, 6);

  const trustMetrics = [
    { value: verifiedCount, label: 'perfiles verificados' },
    { value: reviewCount, label: reviewCount === 1 ? 'reseña publicada' : 'reseñas publicadas' },
    { value: coveredLocations, label: coveredLocations === 1 ? 'zona cubierta' : 'zonas cubiertas' },
  ];

  return (
    <main className="bg-stone-50 text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white" aria-labelledby="home-title">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-emerald-900/50 to-transparent" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-sm font-semibold text-emerald-200">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Profesionales locales, perfiles claros
            </span>
            <h1 id="home-title" className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Resuelve lo de tu hogar con gente de aquí.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
              Encuentra técnicos en Santiago y el Cibao, compara su experiencia y reserva el servicio que necesitas sin dar más vueltas.
            </p>

            <dl className="mt-8 grid max-w-xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5 py-4 backdrop-blur-sm">
              {trustMetrics.map((metric) => (
                <div key={metric.label} className="px-3 text-center sm:px-5 sm:text-left">
                  <dt className="mt-1 text-xs leading-4 text-slate-400 sm:text-sm">{metric.label}</dt>
                  <dd className="text-2xl font-black text-white sm:text-3xl">
                    {loading ? '—' : metric.value.toLocaleString('es-DO')}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white p-5 text-slate-950 shadow-2xl sm:p-7">
            <div className="mb-5">
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Busca en segundos</p>
              <h2 className="mt-1 text-2xl font-black">¿Qué necesitas resolver?</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="home-technician-search" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nombre o servicio
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input
                    id="home-technician-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Ej. electricista, plomero..."
                    autoComplete="off"
                    className="h-12 border-stone-300 bg-white pl-10 text-base text-slate-950 placeholder:text-slate-400 focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Servicio</span>
                  <Select
                    value={selectedSpecialization || 'all'}
                    onValueChange={(value: string) =>
                      setSelectedSpecialization(value === 'all' ? '' : value)
                    }
                  >
                    <SelectTrigger aria-label="Servicio" className="h-12 border-stone-300 bg-white text-left text-base focus:ring-emerald-500">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los servicios</SelectItem>
                      {specializations.map((specialization) => (
                        <SelectItem key={specialization} value={specialization}>
                          {specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">Ubicación</span>
                  <Select
                    value={selectedLocation || 'all'}
                    onValueChange={(value: string) =>
                      setSelectedLocation(value === 'all' ? '' : value)
                    }
                  >
                    <SelectTrigger aria-label="Ubicación" className="h-12 border-stone-300 bg-white text-left text-base focus:ring-emerald-500">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las ubicaciones</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                <a
                  href="#technician-results"
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  Ver técnicos
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </a>
                {activeFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-stone-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {featuredServices.length > 0 && (
        <section className="border-b border-stone-200 bg-white" aria-labelledby="service-shortcuts-title">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Servicios populares</p>
                <h2 id="service-shortcuts-title" className="mt-1 text-2xl font-black text-slate-950">
                  Empieza por lo que necesitas
                </h2>
              </div>
              <p className="text-sm text-slate-500">Selecciona una categoría para filtrar los resultados.</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {featuredServices.map((service) => {
                const ServiceIcon = serviceIconFor(service);
                const isSelected = selectedSpecialization === service;
                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => setSelectedSpecialization(isSelected ? '' : service)}
                    aria-pressed={isSelected}
                    className={`flex min-h-24 flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                        : 'border-stone-200 bg-stone-50 text-slate-800 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white hover:shadow-sm motion-reduce:hover:translate-y-0'
                    }`}
                  >
                    <span className={`rounded-xl p-2 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 shadow-sm'}`}>
                      <ServiceIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="mt-3 text-sm font-bold leading-5">{service}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section
        id="technician-results"
        className="scroll-mt-24"
        aria-labelledby="technician-results-title"
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Directorio local</p>
              <h2 id="technician-results-title" className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                Técnicos disponibles
              </h2>
              <p className="mt-2 text-sm text-slate-600" aria-live="polite" aria-atomic="true">
                {loading
                  ? 'Buscando profesionales…'
                  : error
                  ? 'No pudimos actualizar los resultados.'
                  : `${filteredTechnicians.length} ${
                      filteredTechnicians.length === 1 ? 'perfil encontrado' : 'perfiles encontrados'
                    }`}
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                <LockKeyhole className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                El contacto se comparte solo dentro de una reserva.
              </p>
              {activeFilters && !loading && !error && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Restablecer filtros
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="mt-7" role="status" aria-live="polite" aria-busy="true">
              <span className="sr-only">Cargando técnicos disponibles</span>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <TechnicianSkeleton key={index} />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="mt-7 rounded-3xl border border-rose-200 bg-white px-6 py-12 text-center shadow-sm" role="alert">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <WifiOff className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-black text-slate-950">No pudimos cargar el directorio</h3>
              <p className="mx-auto mt-2 max-w-lg text-slate-600">
                {error || 'Revisa tu conexión e inténtalo de nuevo.'}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Intentar de nuevo
              </button>
            </div>
          ) : filteredTechnicians.length === 0 ? (
            <div className="mt-7 rounded-3xl border border-stone-200 bg-white px-6 py-12 text-center shadow-sm">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-slate-600">
                <SearchX className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-black text-slate-950">
                {activeFilters ? 'No encontramos una coincidencia' : 'El directorio está comenzando'}
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-slate-600">
                {activeFilters
                  ? 'Prueba con otro servicio, una zona cercana o una búsqueda más corta. Seguro aparece alguien que te resuelva.'
                  : 'Todavía no hay perfiles publicados. Vuelve pronto mientras sumamos profesionales de la zona.'}
              </p>
              {activeFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Ver todos los técnicos
                </button>
              )}
            </div>
          ) : (
            <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredTechnicians.map((technician) => (
                <TechnicianCard
                  key={technician.id}
                  technician={technician}
                  currentUser={currentUser}
                  onLoginRequired={onLoginRequired}
                  onBook={onBook}
                  onReview={onReview}
                  canReview={hasCompletedBooking(technician.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white" aria-labelledby="how-it-works-title">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Simple y claro</p>
            <h2 id="how-it-works-title" className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Del problema a la cita en tres pasos
            </h2>
          </div>

          <ol className="mt-10 grid gap-5 lg:grid-cols-3">
            {[
              {
                icon: Search,
                title: 'Busca por servicio y zona',
                description: 'Filtra el directorio para ver profesionales que trabajan cerca de ti.',
              },
              {
                icon: UserCheck,
                title: 'Compara perfiles',
                description: 'Revisa especialidades, verificación, ubicación y valoraciones antes de decidir.',
              },
              {
                icon: CalendarDays,
                title: 'Reserva y coordina',
                description: 'Elige una fecha disponible. Los datos de contacto se comparten de forma privada.',
              },
            ].map((step, index) => {
              const StepIcon = step.icon;
              return (
                <li key={step.title} className="relative rounded-2xl border border-stone-200 bg-stone-50 p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <StepIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-4xl font-black text-stone-200" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-black text-slate-950">{step.title}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{step.description}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </main>
  );
};

export default HomeView;
