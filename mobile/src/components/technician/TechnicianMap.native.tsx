import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  LocateFixed,
  MapPin,
  ShieldCheck,
  Star,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Circle,
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';

import {
  createTechnicianMapMarkers,
  getTechnicianForMarker,
} from '@/lib/map';

import type { TechnicianMapProps } from './TechnicianMap.types';
import { DirectoryColors, DirectoryRadius, DirectorySpacing } from './tokens';

const SANTIAGO_REGION: Region = {
  latitude: 19.4517,
  longitude: -70.697,
  latitudeDelta: 0.28,
  longitudeDelta: 0.22,
};

export function TechnicianMap({
  technicians,
  selectedTechnicianId,
  userCoordinates,
  isLocating,
  locationMessage,
  onBookTechnician,
  onOpenTechnician,
  onRequestLocation,
  onSelectTechnician,
}: TechnicianMapProps) {
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const markers = useMemo(() => createTechnicianMapMarkers(technicians), [technicians]);
  const selectedMarker = markers.find((marker) => marker.id === selectedTechnicianId) ?? null;
  const selectedTechnician = getTechnicianForMarker(technicians, selectedMarker?.id ?? null);

  useEffect(() => {
    if (!mapReady || markers.length === 0) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        markers.map((marker) => marker.coordinate),
        {
          animated: true,
          edgePadding: { top: 80, right: 54, bottom: 180, left: 54 },
        }
      );
    }, 120);
    return () => clearTimeout(timer);
  }, [mapReady, markers]);

  useEffect(() => {
    if (!mapReady || !userCoordinates) return;
    mapRef.current?.animateToRegion(
      {
        latitude: userCoordinates.latitude,
        longitude: userCoordinates.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.06,
      },
      350
    );
  }, [mapReady, userCoordinates]);

  const centerCurrentLocation = () => {
    if (!userCoordinates) {
      onRequestLocation();
      return;
    }
    mapRef.current?.animateToRegion(
      {
        latitude: userCoordinates.latitude,
        longitude: userCoordinates.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.06,
      },
      350
    );
  };

  return (
    <View style={styles.shell}>
      <MapView
        accessibilityLabel="Mapa de zonas aproximadas de técnicos"
        initialRegion={SANTIAGO_REGION}
        loadingBackgroundColor={DirectoryColors.sand}
        loadingEnabled
        loadingIndicatorColor={DirectoryColors.clay}
        mapPadding={{ top: 50, right: 10, bottom: selectedTechnician ? 170 : 30, left: 10 }}
        moveOnMarkerPress={false}
        onMapReady={() => setMapReady(true)}
        onPress={() => onSelectTechnician(null)}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        ref={mapRef}
        rotateEnabled={false}
        showsCompass={false}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        showsUserLocation={Boolean(userCoordinates)}
        style={styles.map}
        toolbarEnabled={false}
      >
        {selectedMarker ? (
          <Circle
            center={selectedMarker.serviceAreaCenter}
            fillColor="rgba(42, 127, 116, 0.09)"
            radius={selectedMarker.radiusKm * 1000}
            strokeColor="rgba(42, 127, 116, 0.45)"
            strokeWidth={1.5}
          />
        ) : null}
        {markers.map((marker) => {
          const selected = marker.id === selectedTechnicianId;
          return (
            <Marker
              accessibilityLabel={`${marker.name}, zona aproximada ${marker.location}`}
              anchor={{ x: 0.5, y: 1 }}
              coordinate={marker.coordinate}
              key={marker.id}
              onPress={(event) => {
                event.stopPropagation();
                onSelectTechnician(marker.id);
              }}
              tracksViewChanges={selected}
            >
              <View style={[styles.marker, selected && styles.markerSelected]}>
                {selected ? (
                  <Text style={styles.markerRating}>{marker.rating > 0 ? marker.rating.toFixed(1) : '•'}</Text>
                ) : (
                  <MapPin color={DirectoryColors.white} size={18} strokeWidth={2.7} />
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View pointerEvents="none" style={styles.privacyPill}>
        <ShieldCheck color={DirectoryColors.tealDark} size={15} />
        <Text style={styles.privacyText}>Zonas aproximadas · sin domicilios</Text>
      </View>

      <Pressable
        accessibilityHint={
          userCoordinates
            ? 'Centra el mapa en tu ubicación actual'
            : 'Solicita permiso de ubicación mientras usas la aplicación'
        }
        accessibilityLabel={userCoordinates ? 'Centrar en mi ubicación' : 'Usar mi ubicación'}
        accessibilityRole="button"
        accessibilityState={{ busy: isLocating, disabled: isLocating }}
        disabled={isLocating}
        onPress={centerCurrentLocation}
        style={({ pressed }) => [
          styles.locationButton,
          userCoordinates && styles.locationButtonEnabled,
          pressed && styles.controlPressed,
        ]}
      >
        {isLocating ? (
          <ActivityIndicator color={DirectoryColors.ocean} size="small" />
        ) : (
          <LocateFixed
            color={userCoordinates ? DirectoryColors.tealDark : DirectoryColors.oceanDark}
            size={22}
          />
        )}
      </Pressable>

      {locationMessage ? (
        <View accessibilityLiveRegion="polite" style={styles.locationNotice}>
          <Text style={styles.locationNoticeText}>{locationMessage}</Text>
        </View>
      ) : null}

      {markers.length === 0 ? (
        <View pointerEvents="none" style={styles.emptyOverlay}>
          <View style={styles.emptyIcon}>
            <MapPin color={DirectoryColors.ocean} size={24} />
          </View>
          <Text style={styles.emptyTitle}>No hay zonas para mostrar</Text>
          <Text style={styles.emptyDescription}>
            Estos perfiles aún no tienen una zona aproximada publicada. Puedes verlos en la lista.
          </Text>
        </View>
      ) : null}

      {selectedTechnician && selectedMarker ? (
        <View style={styles.preview}>
          <Pressable
            accessibilityHint="Abre el perfil completo"
            accessibilityRole="button"
            onPress={() => onOpenTechnician(selectedTechnician)}
            style={({ pressed }) => [styles.previewProfile, pressed && styles.previewPressed]}
          >
            <View style={styles.previewTopRow}>
              <View style={styles.previewIdentity}>
                <View style={styles.previewNameRow}>
                  <Text numberOfLines={1} style={styles.previewName}>
                    {selectedTechnician.name}
                  </Text>
                  {selectedTechnician.verified ? (
                    <BadgeCheck color={DirectoryColors.teal} size={17} />
                  ) : null}
                </View>
                <View style={styles.previewMetaRow}>
                  <MapPin color={DirectoryColors.ocean} size={14} />
                  <Text numberOfLines={1} style={styles.previewLocation}>
                    {selectedTechnician.location} · área de {selectedMarker.radiusKm} km
                  </Text>
                </View>
              </View>
              <ChevronRight color={DirectoryColors.muted} size={20} />
            </View>
            <View style={styles.ratingRow}>
              <Star color={DirectoryColors.amber} fill={DirectoryColors.amber} size={16} />
              <Text style={styles.ratingValue}>
                {selectedTechnician.rating > 0 ? selectedTechnician.rating.toFixed(1) : 'Nuevo'}
              </Text>
              {selectedTechnician.ratingCount > 0 ? (
                <Text style={styles.ratingCount}>
                  ({selectedTechnician.ratingCount}{' '}
                  {selectedTechnician.ratingCount === 1 ? 'calificación' : 'calificaciones'})
                </Text>
              ) : null}
            </View>
          </Pressable>
          <Pressable
            accessibilityLabel={`Solicitar servicio con ${selectedTechnician.name}`}
            accessibilityRole="button"
            onPress={() => onBookTechnician(selectedTechnician)}
            style={({ pressed }) => [styles.bookButton, pressed && styles.bookButtonPressed]}
          >
            <CalendarDays color={DirectoryColors.white} size={17} />
            <Text style={styles.bookButtonText}>Solicitar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export type { TechnicianMapProps } from './TechnicianMap.types';

const styles = StyleSheet.create({
  shell: {
    backgroundColor: DirectoryColors.oceanSoft,
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.lg,
    borderWidth: 1,
    height: 520,
    marginHorizontal: DirectorySpacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  marker: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.ocean,
    borderColor: DirectoryColors.white,
    borderRadius: 20,
    borderWidth: 3,
    height: 40,
    justifyContent: 'center',
    shadowColor: DirectoryColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    width: 40,
    elevation: 5,
  },
  markerSelected: {
    backgroundColor: DirectoryColors.clay,
    height: 46,
    width: 46,
  },
  markerRating: {
    color: DirectoryColors.white,
    fontSize: 11,
    fontWeight: '900',
  },
  privacyPill: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(250, 247, 240, 0.96)',
    borderColor: 'rgba(42, 127, 116, 0.24)',
    borderRadius: DirectoryRadius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    left: 54,
    paddingHorizontal: DirectorySpacing.md,
    paddingVertical: 8,
    position: 'absolute',
    right: 54,
    top: DirectorySpacing.md,
  },
  privacyText: {
    color: DirectoryColors.tealDark,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: DirectorySpacing.md,
    top: 62,
    width: 48,
    elevation: 4,
  },
  locationButtonEnabled: {
    backgroundColor: DirectoryColors.tealSoft,
    borderColor: '#BCE0D9',
  },
  controlPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  locationNotice: {
    backgroundColor: 'rgba(23, 35, 60, 0.92)',
    borderRadius: DirectoryRadius.sm,
    left: DirectorySpacing.md,
    paddingHorizontal: DirectorySpacing.md,
    paddingVertical: 9,
    position: 'absolute',
    right: 72,
    top: 65,
  },
  locationNoticeText: {
    color: DirectoryColors.white,
    fontSize: 11,
    lineHeight: 16,
  },
  emptyOverlay: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(250, 247, 240, 0.96)',
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    left: DirectorySpacing.xl,
    padding: DirectorySpacing.xl,
    position: 'absolute',
    right: DirectorySpacing.xl,
    top: 150,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.oceanSoft,
    borderRadius: DirectoryRadius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  emptyTitle: {
    color: DirectoryColors.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: DirectorySpacing.md,
  },
  emptyDescription: {
    color: DirectoryColors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  preview: {
    alignItems: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.lg,
    borderWidth: 1,
    bottom: DirectorySpacing.md,
    flexDirection: 'row',
    gap: DirectorySpacing.sm,
    left: DirectorySpacing.md,
    padding: DirectorySpacing.md,
    position: 'absolute',
    right: DirectorySpacing.md,
    shadowColor: DirectoryColors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 7,
  },
  previewProfile: {
    borderRadius: DirectoryRadius.md,
    flex: 1,
    minWidth: 0,
    padding: 4,
  },
  previewPressed: {
    backgroundColor: DirectoryColors.sand,
  },
  previewTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  previewIdentity: {
    flex: 1,
    minWidth: 0,
  },
  previewNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  previewName: {
    color: DirectoryColors.ink,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  previewMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  previewLocation: {
    color: DirectoryColors.muted,
    flex: 1,
    fontSize: 11,
  },
  ratingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: DirectorySpacing.sm,
  },
  ratingValue: {
    color: DirectoryColors.charcoal,
    fontSize: 12,
    fontWeight: '900',
  },
  ratingCount: {
    color: DirectoryColors.muted,
    fontSize: 10,
  },
  bookButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: DirectoryColors.clay,
    borderRadius: DirectoryRadius.md,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: DirectorySpacing.md,
  },
  bookButtonPressed: {
    backgroundColor: DirectoryColors.clayDark,
  },
  bookButtonText: {
    color: DirectoryColors.white,
    fontSize: 12,
    fontWeight: '900',
  },
});
