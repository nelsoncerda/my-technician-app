import { Stack, router } from 'expo-router';
import { Building2, MapPin, Phone, Wrench } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import {
  formatDominicanPhone,
  getAuthErrorMessage,
  type FieldErrors,
} from '@/components/account/form-utils';
import { CommunityConsentCard } from '@/components/moderation';
import { Button, LoadingState, Screen, TextField } from '@/components/ui';
import { BrandColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { api } from '@/lib/api';
import { registerTechnician } from '@/lib/profile-api';
import { useCommunityConsent } from '@/lib/use-community-consent';
import { useAuth } from '@/providers/auth';
import type { Settings } from '@/types/api';

type ProfessionalField = 'phone' | 'specializations' | 'location' | 'companyName';
const EMPTY_SETTINGS: Settings = { locations: [], specializations: [] };

export default function BecomeTechnicianScreen() {
  const { isAuthenticated, isLoading: isLoadingAuth, token, updateSessionUser, user } = useAuth();
  const [phone, setPhone] = useState(formatDominicanPhone(user?.phone ?? ''));
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mapVisible, setMapVisible] = useState(true);
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState('');
  const [errors, setErrors] = useState<FieldErrors<ProfessionalField>>({});
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentError, setConsentError] = useState('');
  const communityConsent = useCommunityConsent(token);

  useEffect(() => {
    const timeout = setTimeout(() => setPhone(formatDominicanPhone(user?.phone ?? '')), 0);
    return () => clearTimeout(timeout);
  }, [user?.phone]);

  const loadSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    setSettingsError('');
    try {
      setSettings(await api.settings.get());
    } catch (error: unknown) {
      setSettingsError(getAuthErrorMessage(
        error,
        'No pudimos cargar las especialidades y zonas disponibles.'
      ));
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void api.settings.get()
      .then((result) => {
        if (active) setSettings(result);
      })
      .catch((error: unknown) => {
        if (active) {
          setSettingsError(getAuthErrorMessage(
            error,
            'No pudimos cargar las especialidades y zonas disponibles.'
          ));
        }
      })
      .finally(() => {
        if (active) setIsLoadingSettings(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleSpecialization = (specialization: string) => {
    setSpecializations((current) => (
      current.includes(specialization)
        ? current.filter((item) => item !== specialization)
        : current.length < 10
          ? [...current, specialization]
          : current
    ));
    if (errors.specializations) {
      setErrors((current) => ({ ...current, specializations: undefined }));
    }
  };

  const submit = async () => {
    if (!user || !token) return;
    const normalizedCompanyName = companyName.trim().replace(/\s+/g, ' ');
    const nextErrors: FieldErrors<ProfessionalField> = {};

    if (phone && !/^\d{3}-\d{3}-\d{4}$/.test(phone)) {
      nextErrors.phone = 'Completa los 10 dígitos del teléfono.';
    }
    if (specializations.length === 0) {
      nextErrors.specializations = 'Selecciona al menos una especialidad.';
    }
    if (!location) nextErrors.location = 'Selecciona tu zona de servicio.';
    if (normalizedCompanyName.length > 120) nextErrors.companyName = 'Usa 120 caracteres o menos.';

    setErrors(nextErrors);
    setRequestError('');
    setConsentError('');
    if (Object.keys(nextErrors).length > 0) return;
    if (settingsError) {
      setRequestError('Vuelve a cargar las opciones profesionales antes de continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      await communityConsent.acceptIfNeeded();
      const technician = await registerTechnician({
        specializations,
        location,
        phone: phone || undefined,
        companyName: normalizedCompanyName || undefined,
        mapVisible,
      }, token);
      await updateSessionUser({
        role: 'technician',
        technicianId: technician.id,
        phone: phone || user.phone,
        specializations: technician.specializations ?? specializations,
        location: technician.location ?? location,
        companyName: (technician.companyName ?? normalizedCompanyName) || undefined,
        mapVisible: technician.mapVisible ?? mapVisible,
        technicianModerationStatus:
          technician.technicianModerationStatus ?? technician.moderationStatus ?? 'PENDING',
        technicianModerationReason:
          technician.technicianModerationReason ?? technician.moderationReason ?? null,
      });
      router.replace('/account');
    } catch (error: unknown) {
      const message = getAuthErrorMessage(
        error,
        'No pudimos crear tu perfil profesional. Inténtalo de nuevo.'
      );
      if (!communityConsent.accepted) setConsentError(message);
      setRequestError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Ser profesional' }} />
        <LoadingState message="Cargando tu cuenta…" />
      </Screen>
    );
  }

  if (!isAuthenticated || !user || !token) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Stack.Screen options={{ title: 'Ser profesional' }} />
        <Text style={styles.centeredTitle}>Inicia sesión para publicar tus servicios</Text>
        <Button label="Iniciar sesión" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  if (user.role !== 'user') {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Stack.Screen options={{ title: 'Ser profesional' }} />
        <Wrench color={BrandColors.ocean500} size={38} accessible={false} />
        <Text style={styles.centeredTitle}>
          {user.role === 'technician' ? 'Ya tienes un perfil profesional' : 'Esta cuenta no necesita un perfil técnico'}
        </Text>
        <Button label="Volver a Cuenta" onPress={() => router.replace('/account')} variant="outline" />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Ser profesional' }} />
      <View style={styles.heroCard}>
        <View style={styles.heroIcon} accessible={false}>
          <Wrench color={BrandColors.cream} size={28} />
        </View>
        <Text style={styles.heroTitle}>Ofrece tus servicios en tu comunidad</Text>
        <Text style={styles.heroDescription}>
          Completa tu especialidad y zona para recibir solicitudes. Tu cuenta seguirá sirviendo también para contratar otros técnicos.
        </Text>
      </View>

      {requestError ? (
        <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
          <Text style={styles.errorText} role="alert">{requestError}</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <TextField
          autoComplete="tel"
          editable={!isSubmitting}
          error={errors.phone}
          helperText="Los clientes podrán usarlo después de reservar."
          keyboardType="phone-pad"
          label="Teléfono profesional"
          leftIcon={<Phone color={BrandColors.muted} size={20} />}
          maxLength={18}
          onChangeText={(value) => {
            setPhone(formatDominicanPhone(value));
            if (errors.phone) setErrors((current) => ({ ...current, phone: undefined }));
          }}
          placeholder="809-555-0123"
          textContentType="telephoneNumber"
          value={phone}
        />

        <TextField
          autoCapitalize="words"
          editable={!isSubmitting}
          error={errors.companyName}
          helperText="Opcional. Puedes usar tu nombre comercial."
          label="Empresa o negocio"
          leftIcon={<Building2 color={BrandColors.muted} size={20} />}
          maxLength={120}
          onChangeText={(value) => {
            setCompanyName(value);
            if (errors.companyName) setErrors((current) => ({ ...current, companyName: undefined }));
          }}
          placeholder="Ej. Servicios Técnicos González"
          value={companyName}
        />

        <View>
          <Text style={styles.fieldLabel}>Especialidades</Text>
          <Text style={styles.fieldHelp}>Selecciona entre 1 y 10 servicios que ofreces.</Text>
          {isLoadingSettings ? (
            <LoadingState message="Cargando opciones…" />
          ) : settingsError ? (
            <View style={styles.settingsErrorCard}>
              <Text style={styles.errorText}>{settingsError}</Text>
              <Button label="Reintentar" onPress={() => void loadSettings()} size="sm" variant="outline" />
            </View>
          ) : (
            <View style={styles.choiceWrap}>
              {settings.specializations.map((specialization) => (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: specializations.includes(specialization) }}
                  key={specialization}
                  onPress={() => toggleSpecialization(specialization)}
                  style={({ pressed }) => [
                    styles.choiceChip,
                    specializations.includes(specialization) && styles.choiceChipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[
                    styles.choiceChipText,
                    specializations.includes(specialization) && styles.choiceChipTextSelected,
                  ]}>
                    {specialization}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {errors.specializations ? <Text style={styles.fieldError}>{errors.specializations}</Text> : null}
        </View>

        <View>
          <Text style={styles.fieldLabel}>Zona de servicio</Text>
          <Text style={styles.fieldHelp}>Mostramos la zona general, nunca una dirección privada.</Text>
          {!isLoadingSettings && !settingsError ? (
            <View style={styles.locationList}>
              {settings.locations.map((item) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: location === item }}
                  key={item}
                  onPress={() => {
                    setLocation(item);
                    if (errors.location) setErrors((current) => ({ ...current, location: undefined }));
                  }}
                  style={({ pressed }) => [
                    styles.locationChoice,
                    location === item && styles.locationChoiceSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <MapPin
                    color={location === item ? BrandColors.clay600 : BrandColors.ocean500}
                    size={18}
                    accessible={false}
                  />
                  <Text style={[styles.locationText, location === item && styles.locationTextSelected]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {errors.location ? <Text style={styles.fieldError}>{errors.location}</Text> : null}
        </View>

        <View style={styles.mapVisibilityRow}>
          <View style={styles.mapVisibilityCopy}>
            <Text style={styles.mapVisibilityTitle}>Mostrar mi zona en el mapa</Text>
            <Text style={styles.fieldHelp}>
              Será un área aproximada, nunca tu domicilio ni ubicación en vivo.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Mostrar mi zona aproximada en el mapa"
            onValueChange={setMapVisible}
            thumbColor={BrandColors.cream}
            trackColor={{ false: BrandColors.border, true: BrandColors.teal600 }}
            value={mapVisible}
          />
        </View>
      </View>

      <CommunityConsentCard
        accepted={communityConsent.accepted}
        checked={communityConsent.checked}
        disabled={isSubmitting || communityConsent.isAccepting}
        error={consentError || communityConsent.error}
        onChange={(checked) => {
          communityConsent.setChecked(checked);
          setConsentError('');
        }}
      />

      <Button
        disabled={
          isSubmitting ||
          isLoadingSettings ||
          communityConsent.isLoading ||
          communityConsent.isAccepting
        }
        fullWidth
        label="Publicar mi perfil profesional"
        loading={isSubmitting}
        onPress={() => void submit()}
        size="lg"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    gap: Spacing.md,
    maxWidth: 640,
    paddingHorizontal: Spacing.md,
    width: '100%',
  },
  centered: { alignItems: 'center', gap: Spacing.lg, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  centeredTitle: { color: BrandColors.ink, fontSize: Typography.title.fontSize, fontWeight: '800', textAlign: 'center' },
  heroCard: { ...Shadows.card, backgroundColor: BrandColors.ink, borderRadius: Radius.xl, padding: Spacing.lg },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: BrandColors.clay600,
    borderRadius: Radius.lg,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  heroTitle: {
    color: BrandColors.cream,
    fontSize: Typography.title.fontSize,
    fontWeight: '800',
    lineHeight: Typography.title.lineHeight,
    marginTop: Spacing.md,
  },
  heroDescription: { color: '#D5DBE7', fontSize: Typography.body.fontSize, lineHeight: Typography.body.lineHeight, marginTop: Spacing.sm },
  formCard: {
    backgroundColor: BrandColors.cream,
    borderColor: BrandColors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  errorBanner: { backgroundColor: BrandColors.dangerSoft, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: BrandColors.danger, fontSize: Typography.label.fontSize, fontWeight: '600' },
  fieldLabel: { color: BrandColors.ink, fontSize: Typography.label.fontSize, fontWeight: '700', marginBottom: Spacing.xs },
  fieldHelp: { color: BrandColors.muted, fontSize: Typography.caption.fontSize, lineHeight: Typography.caption.lineHeight, marginBottom: Spacing.sm },
  fieldError: { color: BrandColors.danger, fontSize: Typography.caption.fontSize, marginTop: Spacing.xs },
  settingsErrorCard: {
    alignItems: 'flex-start',
    backgroundColor: BrandColors.dangerSoft,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  choiceChip: {
    borderColor: BrandColors.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  choiceChipSelected: { backgroundColor: BrandColors.clay50, borderColor: BrandColors.clay600 },
  choiceChipText: { color: BrandColors.charcoal, fontSize: Typography.label.fontSize, fontWeight: '600' },
  choiceChipTextSelected: { color: BrandColors.clay700 },
  locationList: { gap: Spacing.sm },
  locationChoice: {
    alignItems: 'center',
    borderColor: BrandColors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  locationChoiceSelected: { backgroundColor: BrandColors.clay50, borderColor: BrandColors.clay600 },
  locationText: { color: BrandColors.charcoal, flex: 1, fontSize: Typography.body.fontSize },
  locationTextSelected: { color: BrandColors.clay700, fontWeight: '700' },
  mapVisibilityRow: {
    alignItems: 'center',
    backgroundColor: BrandColors.ocean50,
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  mapVisibilityCopy: { flex: 1 },
  mapVisibilityTitle: { color: BrandColors.ink, fontSize: Typography.body.fontSize, fontWeight: '700' },
  pressed: { opacity: 0.78 },
});
