import React from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Info, LoaderCircle, MapPinned, Navigation, WifiOff } from 'lucide-react';
import { getTechnicianSpecializations } from '../../lib/search';
import type { HomeTechnician, HomeTechnicianMapLocation } from './HomeView';
import TechnicianRating from './TechnicianRating';

const DEFAULT_CENTER: L.LatLngExpression = [19.4517, -70.697];
const DEFAULT_ZOOM = 11;

export interface MappedTechnician {
  technician: HomeTechnician;
  mapLocation: HomeTechnicianMapLocation;
  position: L.LatLngTuple;
}

export const isValidTechnicianMapLocation = (
  mapLocation: HomeTechnicianMapLocation | null | undefined
): mapLocation is HomeTechnicianMapLocation =>
  Boolean(
    mapLocation &&
      mapLocation.precision === 'approximate' &&
      Number.isFinite(mapLocation.latitude) &&
      Number.isFinite(mapLocation.longitude) &&
      Number.isFinite(mapLocation.radiusKm) &&
      mapLocation.latitude >= -90 &&
      mapLocation.latitude <= 90 &&
      mapLocation.longitude >= -180 &&
      mapLocation.longitude <= 180 &&
      mapLocation.radiusKm > 0
  );

export const getMappableTechnicians = (
  technicians: HomeTechnician[]
): MappedTechnician[] =>
  technicians.flatMap((technician) => {
    const mapLocation = technician.mapLocation;
    if (!isValidTechnicianMapLocation(mapLocation)) {
      return [];
    }

    return [
      {
        technician,
        mapLocation,
        position: [mapLocation.latitude, mapLocation.longitude] as L.LatLngTuple,
      },
    ];
  });

interface TechnicianMapProps {
  technicians: HomeTechnician[];
  activeTechnicianId: string | null;
  isVisible: boolean;
  onTechnicianSelect: (technicianId: string) => void;
  onShowInList: (technicianId: string) => void;
  onShowList: () => void;
}

const markerIcon = (active: boolean) =>
  L.divIcon({
    className: `technician-map-pin${active ? ' technician-map-pin--active' : ''}`,
    html: '<span class="technician-map-pin__shape" aria-hidden="true"><span></span></span>',
    iconSize: active ? [42, 48] : [36, 42],
    iconAnchor: active ? [21, 45] : [18, 39],
  });

const technicianTooltip = (technician: HomeTechnician) => {
  const container = document.createElement('div');
  const name = document.createElement('strong');
  const details = document.createElement('span');
  const services = getTechnicianSpecializations(technician);

  name.textContent = technician.name;
  details.textContent = `${services[0] || 'Técnico'} · ${technician.location}`;
  container.className = 'space-y-0.5';
  name.className = 'block';
  details.className = 'block text-xs';
  container.append(name, details);

  return container;
};

const TechnicianMap: React.FC<TechnicianMapProps> = ({
  technicians,
  activeTechnicianId,
  isVisible,
  onTechnicianSelect,
  onShowInList,
  onShowList,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markerLayerRef = React.useRef<L.FeatureGroup | null>(null);
  const markersRef = React.useRef<Map<string, L.Marker>>(new Map());
  const circlesRef = React.useRef<Map<string, L.Circle>>(new Map());
  const [mapStatus, setMapStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const mappedTechnicians = React.useMemo(
    () => getMappableTechnicians(technicians),
    [technicians]
  );
  const selectedTechnician = mappedTechnicians.find(
    ({ technician }) => technician.id === activeTechnicianId
  )?.technician;
  const unmappedCount = technicians.length - mappedTechnicians.length;

  React.useEffect(() => {
    if (!containerRef.current || process.env.NODE_ENV === 'test') return undefined;

    const markers = markersRef.current;
    const circles = circlesRef.current;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    let tileErrorCount = 0;
    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    })
      .on('loading', () => setMapStatus('loading'))
      .on('tileerror', () => {
        tileErrorCount += 1;
        if (tileErrorCount >= 3) setMapStatus('error');
      })
      .on('load', () => setMapStatus(tileErrorCount >= 3 ? 'error' : 'ready'))
      .addTo(map);

    markerLayerRef.current = L.featureGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      tileLayer.off();
      markers.clear();
      circles.clear();
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersRef.current.clear();
    circlesRef.current.clear();

    mappedTechnicians.forEach(({ technician, mapLocation, position }) => {
      const circle = L.circle(position, {
        radius: mapLocation.radiusKm * 1000,
        color: '#2A6F97',
        fillColor: '#2A6F97',
        fillOpacity: 0.1,
        opacity: 0.45,
        weight: 1.5,
        interactive: false,
      }).addTo(layer);
      const marker = L.marker(position, {
        icon: markerIcon(false),
        keyboard: true,
        riseOnHover: true,
        title: `${technician.name}, zona de servicio aproximada`,
        alt: `Ver ${technician.name} en el mapa`,
      })
        .bindTooltip(technicianTooltip(technician), {
          direction: 'top',
          offset: [0, -30],
        })
        .on('click', () => onTechnicianSelect(technician.id))
        .addTo(layer);

      markersRef.current.set(technician.id, marker);
      circlesRef.current.set(technician.id, circle);
    });

    if (mappedTechnicians.length > 0) {
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
      }
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [mappedTechnicians, onTechnicianSelect]);

  React.useEffect(() => {
    if (!isVisible || !mapRef.current) return;
    const timeoutId = window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
    return () => window.clearTimeout(timeoutId);
  }, [isVisible]);

  React.useEffect(() => {
    markersRef.current.forEach((marker, technicianId) => {
      marker.setIcon(markerIcon(technicianId === activeTechnicianId));
      marker.setZIndexOffset(technicianId === activeTechnicianId ? 1000 : 0);
    });
    circlesRef.current.forEach((circle, technicianId) => {
      const active = technicianId === activeTechnicianId;
      circle.setStyle({
        color: active ? '#E86F2D' : '#2F6FED',
        fillColor: active ? '#E86F2D' : '#2F6FED',
        fillOpacity: active ? 0.16 : 0.1,
        opacity: active ? 0.7 : 0.45,
        weight: active ? 2 : 1.5,
      });
    });
  }, [activeTechnicianId]);

  return (
    <section
      id="technician-map-panel"
      tabIndex={-1}
      aria-labelledby="technician-map-title"
      className="overflow-hidden rounded-3xl border border-brand-border bg-brand-cream shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3 border-b border-brand-border px-4 py-3 sm:px-5">
        <div>
          <h3 id="technician-map-title" className="flex items-center gap-2 font-extrabold text-brand-ink">
            <MapPinned className="h-5 w-5 text-brand-ocean-600" aria-hidden="true" />
            Explora por ubicación
          </h3>
          <p className="mt-1 text-xs leading-5 text-brand-muted">
            {mappedTechnicians.length}{' '}
            {mappedTechnicians.length === 1
              ? 'técnico con zona aproximada'
              : 'técnicos con zona aproximada'}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-ocean-50 px-2.5 py-1 text-xs font-bold text-brand-ocean-700">
          <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
          No es dirección exacta
        </span>
      </div>

      {mappedTechnicians.length === 0 ? (
        <div className="flex min-h-[24rem] flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-ocean-50 text-brand-ocean-700">
            <MapPinned className="h-7 w-7" aria-hidden="true" />
          </span>
          <h4 className="mt-5 text-lg font-extrabold text-brand-ink">
            Aún no hay zonas para mostrar
          </h4>
          <p className="mt-2 max-w-sm text-sm leading-6 text-brand-charcoal">
            Estos perfiles todavía no han publicado una zona aproximada. Puedes verlos y
            solicitar sus servicios desde la lista.
          </p>
          <button
            type="button"
            onClick={onShowList}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-ink px-4 py-2.5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a la lista
          </button>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={containerRef}
            className="h-[min(62dvh,34rem)] min-h-[26rem] w-full bg-brand-ocean-50 lg:h-[42rem]"
            role="region"
            aria-label="Mapa de zonas aproximadas de técnicos"
            aria-busy={mapStatus === 'loading'}
          />
          {mapStatus === 'loading' && (
            <div
              className="pointer-events-none absolute inset-0 z-[450] flex items-center justify-center bg-brand-ocean-50/65"
              role="status"
              aria-live="polite"
            >
              <span className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-brand-cream px-4 py-2.5 text-sm font-bold text-brand-ink shadow-sm">
                <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Cargando mapa…
              </span>
            </div>
          )}
          <p className="pointer-events-none absolute left-3 top-3 z-[500] inline-flex max-w-[calc(100%-1.5rem)] items-start gap-2 rounded-xl border border-brand-border bg-brand-cream/95 px-3 py-2 text-xs leading-5 text-brand-charcoal shadow-sm backdrop-blur">
            <Info className="mt-0.5 h-4 w-4 flex-none text-brand-ocean-700" aria-hidden="true" />
            Los círculos representan áreas generales de servicio para proteger la privacidad.
          </p>
          {mapStatus === 'error' && (
            <div className="absolute inset-x-3 bottom-8 z-[500] rounded-2xl border border-brand-danger-200 bg-brand-cream p-3 shadow-soft" role="alert">
              <div className="flex items-start gap-3">
                <WifiOff className="mt-0.5 h-5 w-5 flex-none text-brand-danger-700" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-brand-ink">No cargó el mapa base</p>
                  <p className="mt-0.5 text-xs leading-5 text-brand-charcoal">
                    Revisa tu conexión o continúa explorando los perfiles en la lista.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onShowList}
                  className="min-h-10 flex-none rounded-lg bg-brand-ink px-3 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500"
                >
                  Ver lista
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTechnician && (
        <div className="border-t border-brand-border bg-brand-cream p-4" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-extrabold text-brand-ink">{selectedTechnician.name}</p>
              <p className="mt-0.5 truncate text-sm text-brand-muted">
                {getTechnicianSpecializations(selectedTechnician)[0] || 'Técnico'} ·{' '}
                {selectedTechnician.location}
              </p>
              <TechnicianRating technician={selectedTechnician} className="mt-2" />
            </div>
            <button
              type="button"
              onClick={() => onShowInList(selectedTechnician.id)}
              className="inline-flex min-h-11 flex-none items-center rounded-xl bg-brand-ocean-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-ocean-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2"
            >
              Ver perfil
            </button>
          </div>
        </div>
      )}

      {unmappedCount > 0 && (
        <p className="border-t border-brand-border bg-brand-sand/70 px-4 py-3 text-xs leading-5 text-brand-charcoal">
          {unmappedCount}{' '}
          {unmappedCount === 1
            ? 'perfil aún no tiene zona aproximada y aparece solo en la lista.'
            : 'perfiles aún no tienen zona aproximada y aparecen solo en la lista.'}
        </p>
      )}
    </section>
  );
};

export default TechnicianMap;
