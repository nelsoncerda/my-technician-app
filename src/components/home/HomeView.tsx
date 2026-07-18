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
  List,
  LockKeyhole,
  Map as MapIcon,
  MapPin,
  Paintbrush,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
  ShieldCheck,
  SlidersHorizontal,
  Snowflake,
  Star,
  UserCheck,
  WifiOff,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { getTechnicianSpecializations } from '../../lib/search';
import SearchAutocomplete from './SearchAutocomplete';
import TechnicianMap, { isValidTechnicianMapLocation } from './TechnicianMap';
import TechnicianRating from './TechnicianRating';

export interface HomeTechnicianReview {
  id: string;
  author: string;
  comment: string;
  rating: number;
  date: string;
}

export interface HomeTechnicianMapLocation {
  latitude: number;
  longitude: number;
  radiusKm: number;
  precision: 'approximate';
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
  mapLocation?: HomeTechnicianMapLocation | null;
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

interface TechnicianCardProps {
  technician: HomeTechnician;
  currentUser: HomeUser | null;
  onLoginRequired: () => void;
  onBook: (technician: HomeTechnician) => void;
  onReview: (technicianId: string) => void;
  canReview: boolean;
  isMapActive: boolean;
  onShowOnMap: (technicianId: string) => void;
}

const TechnicianCard: React.FC<TechnicianCardProps> = ({
  technician,
  currentUser,
  onLoginRequired,
  onBook,
  onReview,
  canReview,
  isMapActive,
  onShowOnMap,
}) => {
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
    <article
      id={`technician-card-${technician.id}`}
      tabIndex={-1}
      className={`group flex h-full min-w-0 flex-col rounded-2xl border bg-brand-cream p-5 shadow-sm transition-all hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2 focus-within:ring-2 focus-within:ring-brand-ocean-500 focus-within:ring-offset-2 ${
        isMapActive
          ? 'border-brand-ocean-500 ring-2 ring-brand-ocean-100'
          : 'border-brand-border'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 flex-none overflow-hidden rounded-2xl bg-brand-ocean-100 ring-1 ring-brand-ocean-100">
          {technician.photoUrl ? (
            <img
              src={technician.photoUrl}
              alt={`Foto de ${technician.name}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-brand-ocean-700">
              {getInitials(technician.name)}
            </div>
          )}
          {technician.verified && (
            <span
              className="absolute bottom-1 right-1 rounded-full bg-brand-cream p-0.5 text-brand-teal-600 shadow-sm"
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
              <h3 className="truncate text-lg font-bold text-brand-ink">
                {technician.name}
              </h3>
              {technician.companyName && (
                <p className="truncate text-sm text-brand-muted">{technician.companyName}</p>
              )}
            </div>
            {technician.verified && (
              <span className="hidden items-center gap-1 rounded-full bg-brand-teal-50 px-2 py-1 text-xs font-semibold text-brand-teal-700 sm:inline-flex">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Verificado
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <TechnicianRating
              technician={technician}
              className="rounded-full bg-amber-50 px-2.5 py-1"
            />
            {isValidTechnicianMapLocation(technician.mapLocation) ? (
              <button
                type="button"
                onClick={() => onShowOnMap(technician.id)}
                className="inline-flex min-h-8 min-w-0 items-center gap-1 rounded-lg px-1.5 text-brand-ocean-700 transition-colors hover:bg-brand-ocean-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500"
                aria-label={`Ver a ${technician.name} en el mapa`}
              >
                <MapPin className="h-4 w-4 flex-none" aria-hidden="true" />
                <span className="truncate">{technician.location}</span>
              </button>
            ) : (
              <span className="inline-flex min-w-0 items-center gap-1 text-brand-muted">
                <MapPin className="h-4 w-4 flex-none text-brand-ocean-600" aria-hidden="true" />
                <span className="truncate">{technician.location}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Servicios ofrecidos">
        {visibleSpecializations.map((specialization) => (
          <span
            key={specialization}
            className="rounded-full bg-brand-sand px-3 py-1 text-xs font-medium text-brand-charcoal"
          >
            {specialization}
          </span>
        ))}
        {remainingSpecializations > 0 && (
          <span className="rounded-full bg-brand-sand px-3 py-1 text-xs font-medium text-brand-charcoal">
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
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-clay-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2"
          aria-label={`${currentUser ? 'Solicitar servicio con' : 'Iniciar sesión para solicitar a'} ${
            technician.name
          }`}
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {currentUser ? 'Solicitar servicio' : 'Entrar para solicitar'}
        </button>
      </div>
    </article>
  );
};

const TechnicianSkeleton = () => (
  <div
    className="rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-sm"
    aria-hidden="true"
  >
    <div className="flex animate-pulse items-start gap-4 motion-reduce:animate-none">
      <div className="h-16 w-16 rounded-2xl bg-brand-border" />
      <div className="flex-1 space-y-3 pt-1">
        <div className="h-5 w-2/3 rounded bg-brand-border" />
        <div className="h-4 w-1/2 rounded bg-brand-sand" />
        <div className="h-4 w-3/4 rounded bg-brand-sand" />
      </div>
    </div>
    <div className="mt-5 flex animate-pulse gap-2 motion-reduce:animate-none">
      <div className="h-7 w-24 rounded-full bg-brand-sand" />
      <div className="h-7 w-28 rounded-full bg-brand-sand" />
    </div>
    <div className="mt-5 h-11 animate-pulse rounded-xl bg-brand-border motion-reduce:animate-none" />
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
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);
  const [resultsView, setResultsView] = React.useState<'list' | 'map'>('list');
  const [activeMapTechnicianId, setActiveMapTechnicianId] = React.useState<string | null>(null);
  const coveredLocations = new Set(
    technicians.map((technician) => technician.location).filter(Boolean)
  ).size;
  const activeFilters = Boolean(
    searchTerm.trim() || selectedSpecialization || selectedLocation
  );
  const featuredServices = specializations.slice(0, 6);
  const activeFilterCount = [selectedSpecialization, selectedLocation].filter(Boolean).length;

  const showResults = () => {
    const resultsSection = document.getElementById('technician-results');
    const resultsTitle = document.getElementById('technician-results-title');
    resultsSection?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    const focusResults = () => resultsTitle?.focus({ preventScroll: true });
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(focusResults);
    } else {
      focusResults();
    }
  };

  React.useEffect(() => {
    if (
      activeMapTechnicianId &&
      !filteredTechnicians.some((technician) => technician.id === activeMapTechnicianId)
    ) {
      setActiveMapTechnicianId(null);
    }
  }, [activeMapTechnicianId, filteredTechnicians]);

  const showTechnicianOnMap = React.useCallback((technicianId: string) => {
    setActiveMapTechnicianId(technicianId);
    setResultsView('map');
    window.requestAnimationFrame?.(() => {
      document.getElementById('technician-map-panel')?.focus({ preventScroll: true });
    });
  }, []);

  const showTechnicianInList = React.useCallback((technicianId: string) => {
    setActiveMapTechnicianId(technicianId);
    setResultsView('list');
    window.requestAnimationFrame?.(() => {
      window.requestAnimationFrame?.(() => {
        const card = document.getElementById(`technician-card-${technicianId}`);
        card?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        card?.focus({ preventScroll: true });
      });
    });
  }, []);

  return (
    <main className="bg-brand-sand text-brand-charcoal">
      <section className="relative overflow-visible bg-brand-ink text-white" aria-labelledby="home-title">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(42,111,151,0.42),transparent_54%)]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:grid-rows-[auto_auto] lg:gap-x-12 lg:gap-y-8 lg:px-8 lg:py-20">
          <div className="max-w-2xl lg:col-start-1 lg:row-start-1 lg:self-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-ocean-500/50 bg-brand-ocean-500/15 px-3 py-1.5 text-xs font-semibold text-brand-ocean-100 max-[359px]:hidden sm:text-sm">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Servicio local, contacto privado
            </span>
            <h1 id="home-title" className="mt-4 max-w-xl text-[2rem] font-extrabold leading-[1.08] tracking-[-0.035em] sm:mt-5 sm:text-5xl lg:text-6xl">
              Encuentra un técnico cerca de ti.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-6 text-slate-300 sm:mt-5 sm:text-xl sm:leading-8">
              Compara profesionales de Santiago y el Cibao y solicita el servicio que necesitas.
            </p>
          </div>

          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              showResults();
            }}
            className="rounded-[1.25rem] border border-brand-border bg-brand-cream p-4 text-brand-charcoal shadow-soft sm:rounded-3xl sm:p-7 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center"
          >
            <div className="mb-4 sm:mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-clay-700 sm:text-sm">Busca en segundos</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">¿Qué servicio necesitas?</h2>
            </div>

            <div className="space-y-4">
              <SearchAutocomplete
                technicians={technicians}
                specializations={specializations}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedSpecialization={selectedSpecialization}
                selectedLocation={selectedLocation}
                onSuggestionSelect={(suggestion) => {
                  if (suggestion.kind === 'service') {
                    setSearchTerm('');
                    setSelectedSpecialization(suggestion.value);
                  }
                  showResults();
                }}
                onSubmit={showResults}
              />

              <button
                type="button"
                onClick={() => setShowMobileFilters((visible) => !visible)}
                className="flex min-h-11 w-full items-center justify-between rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-charcoal sm:hidden"
                aria-expanded={showMobileFilters}
                aria-controls="mobile-home-filters"
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-brand-ocean-600" aria-hidden="true" />
                  Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </span>
                <span className="max-w-[45%] truncate text-right text-xs font-medium text-brand-muted">
                  {selectedLocation || selectedSpecialization || 'Servicio y ubicación'}
                </span>
              </button>

              <div
                id="mobile-home-filters"
                className={`${showMobileFilters ? 'grid' : 'hidden'} gap-3 rounded-xl bg-brand-sand/70 p-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:bg-transparent sm:p-0`}
              >
                <div>
                  <span className="mb-1.5 block text-sm font-semibold text-brand-charcoal">Servicio</span>
                  <Select
                    value={selectedSpecialization || 'all'}
                    onValueChange={(value: string) =>
                      setSelectedSpecialization(value === 'all' ? '' : value)
                    }
                  >
                    <SelectTrigger aria-label="Servicio" className="h-12 border-brand-border bg-white text-left text-base focus:ring-brand-ocean-500">
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
                  <span className="mb-1.5 block text-sm font-semibold text-brand-charcoal">Ubicación</span>
                  <Select
                    value={selectedLocation || 'all'}
                    onValueChange={(value: string) =>
                      setSelectedLocation(value === 'all' ? '' : value)
                    }
                  >
                    <SelectTrigger aria-label="Ubicación" className="h-12 border-brand-border bg-white text-left text-base focus:ring-brand-ocean-500">
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
                <button
                  type="submit"
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-clay-600 px-5 py-3 font-bold text-white shadow-sm transition-colors hover:bg-brand-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2"
                >
                  Ver {filteredTechnicians.length} {filteredTechnicians.length === 1 ? 'técnico' : 'técnicos'}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </button>
                {activeFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:bg-brand-sand hover:text-brand-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="grid gap-2 text-sm text-slate-200 sm:grid-cols-3 lg:col-start-1 lg:row-start-2 lg:grid-cols-1 lg:self-start xl:grid-cols-3">
            <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
              <LockKeyhole className="h-4 w-4 flex-none text-brand-clay-100" aria-hidden="true" />
              Contacto privado
            </span>
            <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
              <CheckCircle2 className="h-4 w-4 flex-none text-brand-clay-100" aria-hidden="true" />
              Reseñas tras cada servicio
            </span>
            {coveredLocations > 0 && (
              <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
                <MapPin className="h-4 w-4 flex-none text-brand-clay-100" aria-hidden="true" />
                {coveredLocations} {coveredLocations === 1 ? 'zona cubierta' : 'zonas cubiertas'}
              </span>
            )}
          </div>
        </div>
      </section>

      {featuredServices.length > 0 && (
        <section className="border-b border-brand-border bg-brand-cream" aria-labelledby="service-shortcuts-title">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-clay-700 sm:text-sm">Servicios populares</p>
                <h2 id="service-shortcuts-title" className="mt-1 text-2xl font-extrabold text-brand-ink">
                  Empieza por lo que necesitas
                </h2>
              </div>
              <p className="text-sm text-brand-muted">Selecciona una categoría para filtrar los resultados.</p>
            </div>

            <div className="-mx-4 mt-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-5 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
              {featuredServices.map((service) => {
                const ServiceIcon = serviceIconFor(service);
                const isSelected = selectedSpecialization === service;
                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => setSelectedSpecialization(isSelected ? '' : service)}
                    aria-pressed={isSelected}
                    className={`flex min-h-12 min-w-[9rem] snap-start items-center gap-2 rounded-full border px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2 sm:min-h-24 sm:min-w-0 sm:flex-col sm:items-start sm:justify-between sm:rounded-2xl sm:p-4 ${
                      isSelected
                        ? 'border-brand-clay-600 bg-brand-clay-50 text-brand-clay-700 shadow-sm'
                        : 'border-brand-border bg-brand-sand text-brand-charcoal hover:-translate-y-0.5 hover:border-brand-clay-500 hover:bg-white hover:shadow-sm motion-reduce:hover:translate-y-0'
                    }`}
                  >
                    <span className={`rounded-xl p-1.5 sm:p-2 ${isSelected ? 'bg-brand-clay-600 text-white' : 'bg-brand-cream text-brand-ocean-600 shadow-sm'}`}>
                      <ServiceIcon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-bold leading-5 sm:mt-3">{service}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section
        id="technician-results"
        className="bg-brand-sand"
        style={{ scrollMarginTop: 'calc(5rem + env(safe-area-inset-top))' }}
        aria-labelledby="technician-results-title"
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col gap-4 border-b border-brand-border pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-clay-700 sm:text-sm">Directorio local</p>
              <h2 id="technician-results-title" tabIndex={-1} className="mt-1 text-3xl font-extrabold tracking-tight text-brand-ink focus:outline-none">
                Técnicos disponibles
              </h2>
              <p className="mt-2 text-sm text-brand-charcoal" aria-live="polite" aria-atomic="true">
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
              {!loading && !error && filteredTechnicians.length > 0 && (
                <div
                  role="group"
                  aria-label="Vista de resultados"
                  className="inline-flex rounded-xl border border-brand-border bg-brand-cream p-1 shadow-sm lg:hidden"
                >
                  <button
                    type="button"
                    onClick={() => setResultsView('list')}
                    aria-pressed={resultsView === 'list'}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 ${
                      resultsView === 'list'
                        ? 'bg-brand-ink text-white'
                        : 'text-brand-charcoal hover:bg-brand-sand'
                    }`}
                  >
                    <List className="h-4 w-4" aria-hidden="true" />
                    Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultsView('map')}
                    aria-pressed={resultsView === 'map'}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 ${
                      resultsView === 'map'
                        ? 'bg-brand-ink text-white'
                        : 'text-brand-charcoal hover:bg-brand-sand'
                    }`}
                  >
                    <MapIcon className="h-4 w-4" aria-hidden="true" />
                    Mapa
                  </button>
                </div>
              )}
              <p className="inline-flex items-center gap-2 text-sm text-brand-charcoal">
                <LockKeyhole className="h-4 w-4 text-brand-teal-700" aria-hidden="true" />
                El contacto se comparte solo dentro de una reserva.
              </p>
              {activeFilters && !loading && !error && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold text-brand-ocean-700 hover:bg-brand-ocean-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500"
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
              <div className="lg:grid lg:grid-cols-[minmax(0,0.98fr)_minmax(380px,1.02fr)] lg:gap-6">
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1">
                  {Array.from({ length: 4 }, (_, index) => (
                    <TechnicianSkeleton key={index} />
                  ))}
                </div>
                <div className="hidden min-h-[42rem] animate-pulse rounded-3xl border border-brand-border bg-brand-ocean-50 motion-reduce:animate-none lg:block" aria-hidden="true">
                  <div className="h-20 border-b border-brand-border bg-brand-cream/70" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="mt-7 rounded-3xl border border-rose-200 bg-brand-cream px-6 py-12 text-center shadow-sm" role="alert">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <WifiOff className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-extrabold text-brand-ink">No pudimos cargar el directorio</h3>
              <p className="mx-auto mt-2 max-w-lg text-brand-charcoal">
                {error || 'Revisa tu conexión e inténtalo de nuevo.'}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 py-2.5 font-bold text-white transition-colors hover:bg-brand-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Intentar de nuevo
              </button>
            </div>
          ) : filteredTechnicians.length === 0 ? (
            <div className="mt-7 rounded-3xl border border-brand-border bg-brand-cream px-6 py-12 text-center shadow-sm">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-sand text-brand-muted">
                <SearchX className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-extrabold text-brand-ink">
                {activeFilters ? 'No encontramos una coincidencia' : 'El directorio está comenzando'}
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-brand-charcoal">
                {activeFilters
                  ? 'Prueba con otro servicio, una zona cercana o una búsqueda más corta. Seguro aparece alguien que te resuelva.'
                  : 'Todavía no hay perfiles publicados. Vuelve pronto mientras sumamos profesionales de la zona.'}
              </p>
              {activeFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-clay-600 px-5 py-2.5 font-bold text-white transition-colors hover:bg-brand-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Ver todos los técnicos
                </button>
              )}
            </div>
          ) : (
            <div className="mt-7 lg:grid lg:grid-cols-[minmax(0,0.98fr)_minmax(380px,1.02fr)] lg:items-start lg:gap-6">
              <div
                id="technician-list-panel"
                className={`${resultsView === 'list' ? 'grid' : 'hidden'} gap-5 md:grid-cols-2 lg:grid lg:grid-cols-1`}
              >
                {filteredTechnicians.map((technician) => (
                  <TechnicianCard
                    key={technician.id}
                    technician={technician}
                    currentUser={currentUser}
                    onLoginRequired={onLoginRequired}
                    onBook={onBook}
                    onReview={onReview}
                    canReview={hasCompletedBooking(technician.id)}
                    isMapActive={activeMapTechnicianId === technician.id}
                    onShowOnMap={showTechnicianOnMap}
                  />
                ))}
              </div>
              <div
                className={`${resultsView === 'map' ? 'block' : 'hidden'} lg:sticky lg:top-24 lg:block`}
              >
                <TechnicianMap
                  technicians={filteredTechnicians}
                  activeTechnicianId={activeMapTechnicianId}
                  isVisible={resultsView === 'map'}
                  onTechnicianSelect={setActiveMapTechnicianId}
                  onShowInList={showTechnicianInList}
                  onShowList={() => setResultsView('list')}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-brand-border bg-brand-cream" aria-labelledby="how-it-works-title">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-clay-700 sm:text-sm">Simple y claro</p>
            <h2 id="how-it-works-title" className="mt-2 text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl">
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
                <li key={step.title} className="relative rounded-2xl border border-brand-border bg-brand-sand p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-clay-600 text-white">
                      <StepIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-4xl font-black text-brand-border" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-extrabold text-brand-ink">{step.title}</h3>
                  <p className="mt-2 leading-7 text-brand-charcoal">{step.description}</p>
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
