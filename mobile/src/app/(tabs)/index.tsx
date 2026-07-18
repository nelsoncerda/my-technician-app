import { useRouter } from 'expo-router';
import {
  List as ListIcon,
  Map as MapIcon,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LocationAction, SearchAutocomplete, ServiceFilterChips } from '@/components/search';
import {
  DirectoryColors,
  DirectoryEmpty,
  DirectoryError,
  DirectoryLoading,
  DirectoryRadius,
  DirectorySpacing,
  TechnicianCard,
  TechnicianMap,
} from '@/components/technician';
import { api } from '@/lib/api';
import { createTechnicianMapMarkers, resolveSelectedMarkerId } from '@/lib/map';
import { filterTechnicians, getTechnicianSpecializations, normalizeSearchValue } from '@/lib/search';
import { useForegroundLocation } from '@/lib/use-foreground-location';
import type { Settings, Technician } from '@/types/api';

const EMPTY_SETTINGS: Settings = { locations: [], specializations: [] };
type DirectoryViewMode = 'list' | 'map';

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'es')
  );

export default function DirectoryScreen() {
  const router = useRouter();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [query, setQuery] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<DirectoryViewMode>('list');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const location = useForegroundLocation();

  const loadDirectory = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [technicianResult, settingsResult] = await Promise.allSettled([
        api.technicians.list(),
        api.settings.get(),
      ]);

      if (technicianResult.status === 'rejected') throw technicianResult.reason;
      setTechnicians(technicianResult.value);
      if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error && caught.message
          ? caught.message
          : 'No pudimos cargar los técnicos.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadDirectory(), 0);
    return () => clearTimeout(timer);
  }, [loadDirectory]);

  const services = useMemo(
    () =>
      uniqueSorted([
        ...settings.specializations,
        ...technicians.flatMap(getTechnicianSpecializations),
      ]),
    [settings.specializations, technicians]
  );

  const locations = useMemo(
    () => uniqueSorted([...settings.locations, ...technicians.map((item) => item.location)]),
    [settings.locations, technicians]
  );

  const visibleServiceFilters = useMemo(() => {
    const firstServices = services.slice(0, 10);
    if (!selectedService || firstServices.includes(selectedService)) return firstServices;
    return [selectedService, ...firstServices.slice(0, 9)];
  }, [selectedService, services]);

  const filteredTechnicians = useMemo(
    () =>
      filterTechnicians(technicians, {
        query,
        specialization: selectedService,
        location: selectedLocation,
      }),
    [query, selectedLocation, selectedService, technicians]
  );

  const mapMarkers = useMemo(
    () => createTechnicianMapMarkers(filteredTechnicians),
    [filteredTechnicians]
  );

  const activeMapTechnicianId = useMemo(
    () => resolveSelectedMarkerId(mapMarkers, selectedTechnicianId),
    [mapMarkers, selectedTechnicianId]
  );

  const hasFilters = Boolean(query.trim() || selectedService || selectedLocation);

  const resetFilters = () => {
    setQuery('');
    setSelectedService('');
    setSelectedLocation('');
    location.reset();
  };

  const openTechnician = (technician: Technician) => {
    router.push({ pathname: '/technician/[id]', params: { id: technician.id } });
  };

  const openBooking = (technician: Technician) => {
    router.push({
      pathname: '/booking/[technicianId]',
      params: { technicianId: technician.id },
    });
  };

  const handleUseCurrentLocation = async () => {
    const result = await location.requestLocation();
    if (!result?.address) return;

    const addressCandidates = [
      result.address.city,
      result.address.district,
      result.address.region,
    ].filter((value): value is string => Boolean(value));

    const matchingLocation = locations.find((knownLocation) => {
      const normalizedKnown = normalizeSearchValue(knownLocation);
      return addressCandidates.some((candidate) => {
        const normalizedCandidate = normalizeSearchValue(candidate);
        return (
          normalizedKnown.includes(normalizedCandidate) ||
          normalizedCandidate.includes(normalizedKnown)
        );
      });
    });

    if (matchingLocation) setSelectedLocation(matchingLocation);
  };

  const locationMessage = location.error
    ? location.error
    : location.coordinates && !selectedLocation
      ? 'Ubicación obtenida. Mostramos las zonas declaradas por cada profesional.'
      : null;

  const header = (
    <View>
      <View style={styles.hero}>
        <View style={styles.eyebrow}>
          <ShieldCheck color="#9FD8CF" size={16} />
          <Text style={styles.eyebrowText}>Profesionales locales</Text>
        </View>
        <Text accessibilityRole="header" style={styles.heroTitle}>
          Resuelve lo de tu hogar con gente de aquí.
        </Text>
        <Text style={styles.heroDescription}>
          Busca por servicio o por nombre y compara perfiles antes de solicitar.
        </Text>

        <View style={styles.searchPanel}>
          <SearchAutocomplete
            onChangeText={setQuery}
            onSelectService={(service) => {
              setQuery('');
              setSelectedService(service);
            }}
            onSelectTechnician={openTechnician}
            onSubmit={() => undefined}
            services={services}
            technicians={technicians}
            value={query}
          />
          <LocationAction
            enabled={Boolean(location.coordinates)}
            loading={location.isLoading}
            message={locationMessage}
            messageTone={location.error ? 'error' : 'info'}
            onPress={() => void handleUseCurrentLocation()}
          />
        </View>
      </View>

      <View style={styles.filtersSection}>
        <ServiceFilterChips
          onSelect={setSelectedService}
          selectedService={selectedService}
          services={visibleServiceFilters}
        />
        {selectedLocation ? (
          <View style={styles.locationFilterRow}>
            <View style={styles.filterLabelRow}>
              <SlidersHorizontal color={DirectoryColors.ocean} size={15} />
              <Text style={styles.filterLabel}>Zona detectada</Text>
            </View>
            <Pressable
              accessibilityLabel={`Quitar filtro de ${selectedLocation}`}
              accessibilityRole="button"
              onPress={() => setSelectedLocation('')}
              style={({ pressed }) => [styles.locationChip, pressed && styles.locationChipPressed]}
            >
              <Text numberOfLines={1} style={styles.locationChipText}>
                {selectedLocation}
              </Text>
              <X color={DirectoryColors.oceanDark} size={16} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.resultsHeader}>
        <View>
          <Text accessibilityRole="header" style={styles.resultsTitle}>
            Técnicos disponibles
          </Text>
          {!loading && !error ? (
            <Text style={styles.resultsCount}>
              {filteredTechnicians.length}{' '}
              {filteredTechnicians.length === 1 ? 'perfil encontrado' : 'perfiles encontrados'}
            </Text>
          ) : null}
        </View>
        <View style={styles.resultsActions}>
          {hasFilters ? (
            <Pressable
              accessibilityRole="button"
              onPress={resetFilters}
              style={({ pressed }) => [styles.resetButton, pressed && styles.resetPressed]}
            >
              <Text style={styles.resetText}>Limpiar</Text>
            </Pressable>
          ) : null}
          <View accessibilityLabel="Vista de resultados" style={styles.viewToggle}>
            <ViewToggleButton
              active={viewMode === 'list'}
              icon="list"
              label="Lista"
              onPress={() => setViewMode('list')}
            />
            <ViewToggleButton
              active={viewMode === 'map'}
              icon="map"
              label="Mapa"
              onPress={() => setViewMode('map')}
            />
          </View>
        </View>
      </View>

      {!loading && !error && viewMode === 'map' ? (
        <TechnicianMap
          isLocating={location.isLoading}
          locationMessage={locationMessage}
          onBookTechnician={openBooking}
          onOpenTechnician={openTechnician}
          onRequestLocation={() => void location.requestLocation()}
          onSelectTechnician={setSelectedTechnicianId}
          onSwitchToList={() => setViewMode('list')}
          selectedTechnicianId={activeMapTechnicianId}
          technicians={filteredTechnicians}
          userCoordinates={location.coordinates}
        />
      ) : null}
    </View>
  );

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={loading || error || viewMode === 'map' ? [] : filteredTechnicians}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      keyExtractor={(technician) => technician.id}
      ListEmptyComponent={
        loading ? (
          <DirectoryLoading />
        ) : error ? (
          <DirectoryError onRetry={() => void loadDirectory()} />
        ) : viewMode === 'map' ? null : (
          <DirectoryEmpty hasFilters={hasFilters} onReset={resetFilters} />
        )
      }
      ListHeaderComponent={header}
      refreshControl={
        <RefreshControl
          colors={[DirectoryColors.clay]}
          onRefresh={() => void loadDirectory(true)}
          refreshing={refreshing}
          tintColor={DirectoryColors.clay}
        />
      }
      renderItem={({ item }) => (
        <View style={styles.cardWrap}>
          <TechnicianCard onBook={openBooking} onView={openTechnician} technician={item} />
        </View>
      )}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    />
  );
}

interface ViewToggleButtonProps {
  active: boolean;
  icon: 'list' | 'map';
  label: string;
  onPress: () => void;
}

function ViewToggleButton({ active, icon, label, onPress }: ViewToggleButtonProps) {
  const Icon = icon === 'list' ? ListIcon : MapIcon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.viewToggleButton,
        active && styles.viewToggleButtonActive,
        pressed && styles.viewToggleButtonPressed,
      ]}
    >
      <Icon color={active ? DirectoryColors.white : DirectoryColors.oceanDark} size={16} />
      <Text style={[styles.viewToggleText, active && styles.viewToggleTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: DirectoryColors.sand,
    flex: 1,
  },
  content: {
    paddingBottom: 36,
  },
  hero: {
    backgroundColor: DirectoryColors.ink,
    paddingBottom: DirectorySpacing.xxl,
    paddingHorizontal: DirectorySpacing.lg,
    paddingTop: DirectorySpacing.xl,
  },
  eyebrow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(42, 127, 116, 0.20)',
    borderColor: 'rgba(110, 182, 172, 0.38)',
    borderRadius: DirectoryRadius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: DirectorySpacing.sm,
    paddingHorizontal: DirectorySpacing.md,
    paddingVertical: 7,
  },
  eyebrowText: {
    color: '#BFE7E1',
    fontSize: 12,
    fontWeight: '800',
  },
  heroTitle: {
    color: DirectoryColors.cream,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.9,
    lineHeight: 35,
    marginTop: DirectorySpacing.lg,
    maxWidth: 500,
  },
  heroDescription: {
    color: '#CAD1DD',
    fontSize: 15,
    lineHeight: 22,
    marginTop: DirectorySpacing.md,
    maxWidth: 520,
  },
  searchPanel: {
    backgroundColor: DirectoryColors.cream,
    borderRadius: DirectoryRadius.lg,
    gap: DirectorySpacing.md,
    marginTop: DirectorySpacing.xl,
    padding: DirectorySpacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 7,
    zIndex: 20,
  },
  filtersSection: {
    gap: DirectorySpacing.md,
    paddingHorizontal: DirectorySpacing.lg,
    paddingTop: DirectorySpacing.xl,
  },
  locationFilterRow: {
    alignItems: 'flex-start',
    gap: DirectorySpacing.sm,
  },
  filterLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  filterLabel: {
    color: DirectoryColors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  locationChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: DirectoryColors.oceanSoft,
    borderColor: '#CEE3EE',
    borderRadius: DirectoryRadius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: DirectorySpacing.sm,
    maxWidth: '100%',
    minHeight: 44,
    paddingHorizontal: DirectorySpacing.md,
  },
  locationChipPressed: {
    opacity: 0.78,
  },
  locationChipText: {
    color: DirectoryColors.oceanDark,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  resultsHeader: {
    alignItems: 'flex-start',
    gap: DirectorySpacing.md,
    paddingBottom: DirectorySpacing.md,
    paddingHorizontal: DirectorySpacing.lg,
    paddingTop: DirectorySpacing.section,
  },
  resultsTitle: {
    color: DirectoryColors.ink,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  resultsCount: {
    color: DirectoryColors.muted,
    fontSize: 13,
    marginTop: 3,
  },
  resetButton: {
    alignItems: 'center',
    borderRadius: DirectoryRadius.pill,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: DirectorySpacing.md,
  },
  resetPressed: {
    backgroundColor: DirectoryColors.claySoft,
  },
  resetText: {
    color: DirectoryColors.clayDark,
    fontSize: 13,
    fontWeight: '900',
  },
  resultsActions: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: DirectorySpacing.sm,
    justifyContent: 'space-between',
  },
  viewToggle: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.oceanSoft,
    borderColor: '#CEE3EE',
    borderRadius: DirectoryRadius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    marginLeft: 'auto',
    padding: 3,
  },
  viewToggleButton: {
    alignItems: 'center',
    borderRadius: DirectoryRadius.pill,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: DirectorySpacing.md,
  },
  viewToggleButtonActive: {
    backgroundColor: DirectoryColors.ocean,
  },
  viewToggleButtonPressed: {
    opacity: 0.78,
  },
  viewToggleText: {
    color: DirectoryColors.oceanDark,
    fontSize: 12,
    fontWeight: '800',
  },
  viewToggleTextActive: {
    color: DirectoryColors.white,
  },
  separator: {
    height: DirectorySpacing.md,
  },
  cardWrap: {
    paddingHorizontal: DirectorySpacing.lg,
  },
});
