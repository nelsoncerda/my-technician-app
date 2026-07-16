import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

export interface ForegroundCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface ForegroundAddress {
  formattedAddress: string;
  street: string | null;
  city: string | null;
  district: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface ForegroundLocationResult {
  coordinates: ForegroundCoordinates;
  address: ForegroundAddress | null;
}

export interface ForegroundLocationState {
  coordinates: ForegroundCoordinates | null;
  address: ForegroundAddress | null;
  permissionStatus: Location.PermissionStatus | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<ForegroundLocationResult | null>;
  reset: () => void;
}

function formatAddress(address: Location.LocationGeocodedAddress): ForegroundAddress {
  const street = [address.street, address.streetNumber].filter(Boolean).join(' ') || null;
  const city = address.city ?? address.subregion ?? null;
  const parts = [street, address.district, city, address.region, address.country]
    .filter((part): part is string => Boolean(part));

  return {
    formattedAddress: parts.join(', '),
    street,
    city,
    district: address.district ?? null,
    region: address.region ?? null,
    postalCode: address.postalCode ?? null,
    country: address.country ?? null,
  };
}

/**
 * Foreground-only location. No permission prompt occurs until requestLocation is called
 * from a deliberate user action such as pressing “Usar mi ubicación”.
 */
export function useForegroundLocation(): ForegroundLocationState {
  const [coordinates, setCoordinates] = useState<ForegroundCoordinates | null>(null);
  const [address, setAddress] = useState<ForegroundAddress | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<ForegroundLocationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(permission.status);
      if (!permission.granted) {
        setError('Activa el permiso de ubicación para usar tu posición actual.');
        return null;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextCoordinates: ForegroundCoordinates = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracy: current.coords.accuracy,
      };

      const geocoded = await Location.reverseGeocodeAsync(nextCoordinates);
      const nextAddress = geocoded[0] ? formatAddress(geocoded[0]) : null;
      setCoordinates(nextCoordinates);
      setAddress(nextAddress);
      return { coordinates: nextCoordinates, address: nextAddress };
    } catch (caught: unknown) {
      setError(
        caught instanceof Error && caught.message
          ? caught.message
          : 'No pudimos obtener tu ubicación. Inténtalo nuevamente.'
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCoordinates(null);
    setAddress(null);
    setError(null);
  }, []);

  return {
    coordinates,
    address,
    permissionStatus,
    isLoading,
    error,
    requestLocation,
    reset,
  };
}
