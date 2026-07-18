import type { Technician } from '@/types/api';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

/** Marker data deliberately excludes contact details and exact addresses. */
export interface TechnicianMapMarker {
  id: string;
  name: string;
  companyName: string | null;
  location: string;
  specialization: string;
  rating: number;
  ratingCount: number;
  verified: boolean;
  serviceAreaCenter: MapCoordinate;
  coordinate: MapCoordinate;
  radiusKm: number;
  precision: 'approximate';
}

const isFiniteCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function createTechnicianMapMarkers(
  technicians: Technician[]
): TechnicianMapMarker[] {
  const rawMarkers = technicians.flatMap((technician) => {
    const mapLocation = technician.mapLocation;
    if (
      !mapLocation ||
      mapLocation.precision !== 'approximate' ||
      !isFiniteCoordinate(mapLocation.latitude) ||
      !isFiniteCoordinate(mapLocation.longitude) ||
      !isFiniteCoordinate(mapLocation.radiusKm) ||
      mapLocation.latitude < -90 ||
      mapLocation.latitude > 90 ||
      mapLocation.longitude < -180 ||
      mapLocation.longitude > 180 ||
      mapLocation.radiusKm < 1 ||
      mapLocation.radiusKm > 100
    ) {
      return [];
    }

    return [
      {
        id: technician.id,
        name: technician.name,
        companyName: technician.companyName ?? null,
        location: technician.location,
        specialization: technician.specialization,
        rating: technician.rating,
        ratingCount: technician.ratingCount,
        verified: technician.verified,
        serviceAreaCenter: {
          latitude: mapLocation.latitude,
          longitude: mapLocation.longitude,
        },
        coordinate: {
          latitude: mapLocation.latitude,
          longitude: mapLocation.longitude,
        },
        radiusKm: mapLocation.radiusKm,
        precision: 'approximate' as const,
      },
    ];
  });

  const groupSizes = new Map<string, number>();
  for (const marker of rawMarkers) {
    const key = `${marker.coordinate.latitude}:${marker.coordinate.longitude}`;
    groupSizes.set(key, (groupSizes.get(key) ?? 0) + 1);
  }

  const groupIndexes = new Map<string, number>();
  return rawMarkers.map((marker) => {
    const key = `${marker.coordinate.latitude}:${marker.coordinate.longitude}`;
    const groupSize = groupSizes.get(key) ?? 1;
    if (groupSize === 1) return marker;

    const index = groupIndexes.get(key) ?? 0;
    groupIndexes.set(key, index + 1);
    const angle = (index / groupSize) * Math.PI * 2 - Math.PI / 2;
    const offsetKm = Math.min(0.6, Math.max(0.2, marker.radiusKm * 0.12));
    const latitudeOffset = (Math.sin(angle) * offsetKm) / 111;
    const longitudeScale = Math.max(
      0.2,
      Math.cos((marker.coordinate.latitude * Math.PI) / 180)
    );
    const longitudeOffset = (Math.cos(angle) * offsetKm) / (111 * longitudeScale);

    return {
      ...marker,
      coordinate: {
        latitude: marker.coordinate.latitude + latitudeOffset,
        longitude: marker.coordinate.longitude + longitudeOffset,
      },
    };
  });
}

export function getTechnicianForMarker(
  technicians: Technician[],
  markerId: string | null
): Technician | null {
  if (!markerId) return null;
  return technicians.find((technician) => technician.id === markerId) ?? null;
}

export function resolveSelectedMarkerId(
  markers: TechnicianMapMarker[],
  selectedMarkerId: string | null
): string | null {
  if (selectedMarkerId && markers.some((marker) => marker.id === selectedMarkerId)) {
    return selectedMarkerId;
  }
  return markers[0]?.id ?? null;
}
