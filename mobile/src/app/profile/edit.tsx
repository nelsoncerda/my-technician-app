import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import { Building2, ImagePlus, Mail, MapPin, Phone, UserRound, Wrench } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import {
  formatDominicanPhone,
  getAuthErrorMessage,
  type FieldErrors,
} from '@/components/account/form-utils';
import { CommunityConsentCard } from '@/components/moderation';
import { Button, LoadingState, Screen, TextField } from '@/components/ui';
import { BrandColors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { api } from '@/lib/api';
import { updateProfile, uploadProfilePhoto } from '@/lib/profile-api';
import { useCommunityConsent } from '@/lib/use-community-consent';
import { useAuth } from '@/providers/auth';
import type { Settings } from '@/types/api';

type ProfileField = 'name' | 'phone' | 'specializations' | 'location' | 'companyName';
const EMPTY_SETTINGS: Settings = { locations: [], specializations: [] };

function getInitials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase()).join('') || 'TR';
}

export default function EditProfileScreen() {
  const { isAuthenticated, isLoading, token, updateSessionUser, user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(formatDominicanPhone(user?.phone ?? ''));
  const [specializations, setSpecializations] = useState<string[]>(user?.specializations ?? []);
  const [location, setLocation] = useState(user?.location ?? '');
  const [companyName, setCompanyName] = useState(user?.companyName ?? '');
  const [mapVisible, setMapVisible] = useState(user?.mapVisible !== false);
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(user?.role === 'technician');
  const [settingsError, setSettingsError] = useState('');
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({});
  const [requestError, setRequestError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');
  const [consentError, setConsentError] = useState('');
  const communityConsent = useCommunityConsent(token);

  const isTechnician = user?.role === 'technician';

  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(() => {
      setName(user.name);
      setPhone(formatDominicanPhone(user.phone ?? ''));
      setSpecializations(user.specializations ?? []);
      setLocation(user.location ?? '');
      setCompanyName(user.companyName ?? '');
      setMapVisible(user.mapVisible !== false);
    }, 0);
    return () => clearTimeout(timeout);
  }, [user]);

  const loadSettings = useCallback(async () => {
    if (!isTechnician) return;
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
  }, [isTechnician]);

  useEffect(() => {
    if (!isTechnician) return undefined;
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
  }, [isTechnician]);

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

  const chooseProfilePhoto = async () => {
    if (!user || !token || isUploadingPhoto) return;
    setRequestError('');
    setPhotoMessage('');
    setConsentError('');
    try {
      await communityConsent.acceptIfNeeded();
    } catch (error: unknown) {
      const message = getAuthErrorMessage(error, 'Debes aceptar las normas para publicar una foto.');
      setConsentError(message);
      setRequestError(message);
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: 'images',
        quality: 0.55,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.base64) {
        setRequestError('No pudimos leer esa imagen. Elige otra foto.');
        return;
      }
      const photo = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
      if (photo.length > 2.7 * 1024 * 1024) {
        setRequestError('La foto es demasiado grande. Elige una imagen más pequeña.');
        return;
      }

      const uploaded = await uploadProfilePhoto(user.id, photo, token);
      await updateSessionUser({
        ...(uploaded.photoUrl !== undefined ? { photoUrl: uploaded.photoUrl } : {}),
        pendingPhotoSubmissionId: uploaded.submissionId,
        photoModerationStatus: uploaded.photoModerationStatus,
        photoModerationReason: null,
        photoSubmittedAt: uploaded.submittedAt,
        photoModerationReviewedAt: null,
      });
      setPhotoMessage(uploaded.message || 'Foto enviada para revisión.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: unknown) {
      setRequestError(getAuthErrorMessage(error, 'No pudimos actualizar tu foto. Inténtalo de nuevo.'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const save = async () => {
    if (!user || !token) return;
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const normalizedCompanyName = companyName.trim().replace(/\s+/g, ' ');
    const nextErrors: FieldErrors<ProfileField> = {};

    if (normalizedName.length < 2) nextErrors.name = 'Ingresa un nombre válido.';
    if (phone && !/^\d{3}-\d{3}-\d{4}$/.test(phone)) {
      nextErrors.phone = 'Completa los 10 dígitos del teléfono.';
    }
    if (isTechnician) {
      if (specializations.length === 0) {
        nextErrors.specializations = 'Selecciona al menos una especialidad.';
      }
      if (!location) nextErrors.location = 'Selecciona tu zona de servicio.';
      if (normalizedCompanyName.length > 120) {
        nextErrors.companyName = 'Usa 120 caracteres o menos.';
      }
    }

    setErrors(nextErrors);
    setRequestError('');
    setConsentError('');
    if (Object.keys(nextErrors).length > 0) return;
    if (isTechnician && settingsError) {
      setRequestError('Vuelve a cargar las opciones profesionales antes de guardar.');
      return;
    }

    setIsSaving(true);
    try {
      await communityConsent.acceptIfNeeded();
      const updatedUser = await updateProfile(user.id, {
        name: normalizedName,
        phone,
        ...(isTechnician && {
          specializations,
          location,
          companyName: normalizedCompanyName || null,
          mapVisible,
          ...(location !== user.location && { serviceArea: null }),
        }),
      }, token);
      await updateSessionUser(updatedUser);
      router.back();
    } catch (error: unknown) {
      const message = getAuthErrorMessage(error, 'No pudimos guardar tu perfil. Inténtalo de nuevo.');
      if (!communityConsent.accepted) setConsentError(message);
      setRequestError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Editar perfil' }} />
        <LoadingState message="Cargando tu perfil…" />
      </Screen>
    );
  }

  if (!isAuthenticated || !user || !token) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <Stack.Screen options={{ title: 'Editar perfil' }} />
        <Text style={styles.title}>Inicia sesión para editar tu perfil</Text>
        <Button label="Iniciar sesión" onPress={() => router.replace('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Editar perfil' }} />
      <View style={styles.introCard}>
        <Text style={styles.eyebrow}>Tu información</Text>
        <Text style={styles.introTitle}>Mantén tu perfil al día</Text>
        <Text style={styles.subtitle}>
          {isTechnician
            ? 'Tus servicios y zona ayudan a que los clientes correctos puedan encontrarte.'
            : 'Estos datos se usan para coordinar tus solicitudes de servicio.'}
        </Text>
      </View>

      {requestError ? (
        <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
          <Text style={styles.errorText} role="alert">{requestError}</Text>
        </View>
      ) : null}

      {photoMessage ? (
        <View style={styles.successBanner} accessibilityLiveRegion="polite">
          <Text style={styles.successText}>{photoMessage} Tu foto pública anterior se mantiene hasta la decisión.</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <View style={styles.photoSection}>
          {user.photoUrl ? (
            <Image
              accessibilityLabel={`Foto de perfil de ${user.name}`}
              source={{ uri: user.photoUrl }}
              style={styles.profilePhoto}
            />
          ) : (
            <View accessibilityLabel={`Iniciales de ${user.name}`} style={styles.profilePhotoFallback}>
              <Text style={styles.profilePhotoInitials}>{getInitials(user.name)}</Text>
            </View>
          )}
          <View style={styles.photoCopy}>
            <Text style={styles.fieldLabel}>Foto de perfil</Text>
            <Text style={styles.fieldHelp}>Elige una imagen cuadrada de hasta 2 MB.</Text>
            {user.photoModerationStatus ? (
              <>
                <Text style={[
                  styles.photoModerationText,
                  user.photoModerationStatus === 'REJECTED' && styles.photoModerationRejected,
                  user.photoModerationStatus === 'APPROVED' && styles.photoModerationApproved,
                ]}>
                  {user.photoModerationStatus === 'PENDING'
                    ? 'Tienes una foto nueva pendiente de revisión.'
                    : user.photoModerationStatus === 'REJECTED'
                      ? 'La foto más reciente no fue aprobada.'
                      : 'La foto más reciente fue aprobada.'}
                </Text>
                {user.photoModerationReason ? (
                  <Text style={styles.photoModerationReason}>Motivo: {user.photoModerationReason}</Text>
                ) : null}
              </>
            ) : null}
            <Button
              disabled={communityConsent.isLoading || communityConsent.isAccepting || isSaving}
              label={user.photoUrl ? 'Cambiar foto' : 'Elegir foto'}
              leftIcon={<ImagePlus color={BrandColors.ink} size={18} />}
              loading={isUploadingPhoto}
              onPress={() => void chooseProfilePhoto()}
              size="sm"
              variant="outline"
            />
          </View>
        </View>

        <TextField
          autoCapitalize="words"
          autoComplete="name"
          editable={!isSaving}
          error={errors.name}
          label="Nombre completo"
          leftIcon={<UserRound color={BrandColors.muted} size={20} />}
          onChangeText={(value) => {
            setName(value);
            if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
          }}
          textContentType="name"
          value={name}
        />

        <TextField
          editable={false}
          helperText="El correo no se puede cambiar desde el perfil."
          label="Correo electrónico"
          leftIcon={<Mail color={BrandColors.muted} size={20} />}
          value={user.email}
        />

        <TextField
          autoComplete="tel"
          editable={!isSaving}
          error={errors.phone}
          keyboardType="phone-pad"
          label="Teléfono"
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
      </View>

      {isTechnician ? (
        <View style={styles.formCard}>
          <View style={styles.sectionHeading}>
            <Wrench color={BrandColors.clay600} size={22} accessible={false} />
            <View style={styles.sectionHeadingCopy}>
              <Text style={styles.sectionTitle}>Perfil profesional</Text>
              <Text style={styles.fieldHelp}>Selecciona entre 1 y 10 servicios.</Text>
            </View>
          </View>

          {isLoadingSettings ? (
            <LoadingState message="Cargando opciones…" />
          ) : settingsError ? (
            <View style={styles.settingsErrorCard}>
              <Text style={styles.errorText}>{settingsError}</Text>
              <Button label="Reintentar" onPress={() => void loadSettings()} size="sm" variant="outline" />
            </View>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Servicios que ofreces</Text>
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
              {errors.specializations ? <Text style={styles.fieldError}>{errors.specializations}</Text> : null}

              <Text style={[styles.fieldLabel, styles.locationLabel]}>Zona de servicio</Text>
              <Text style={styles.fieldHelp}>El mapa usa el centro general de la zona, no tu dirección.</Text>
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
              {errors.location ? <Text style={styles.fieldError}>{errors.location}</Text> : null}
            </>
          )}

          <TextField
            autoCapitalize="words"
            editable={!isSaving}
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

          <View style={styles.mapVisibilityRow}>
            <View style={styles.mapVisibilityCopy}>
              <Text style={styles.mapVisibilityTitle}>Mostrar mi zona en el mapa</Text>
              <Text style={styles.fieldHelp}>
                Publica solo un área aproximada; nunca tu domicilio ni ubicación en vivo.
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
      ) : null}

      <CommunityConsentCard
        accepted={communityConsent.accepted}
        checked={communityConsent.checked}
        disabled={isSaving || isUploadingPhoto || communityConsent.isAccepting}
        error={consentError || communityConsent.error}
        onChange={(checked) => {
          communityConsent.setChecked(checked);
          setConsentError('');
        }}
      />

      <Button
        disabled={
          isSaving ||
          isUploadingPhoto ||
          communityConsent.isLoading ||
          communityConsent.isAccepting ||
          (isTechnician && isLoadingSettings)
        }
        fullWidth
        label="Guardar cambios"
        loading={isSaving}
        onPress={() => void save()}
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
  centered: { alignItems: 'center', gap: Spacing.lg, justifyContent: 'center' },
  introCard: {
    ...Shadows.card,
    backgroundColor: BrandColors.ink,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  eyebrow: {
    color: BrandColors.clay100,
    fontSize: Typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.ink,
    fontSize: Typography.title.fontSize,
    fontWeight: '800',
    lineHeight: Typography.title.lineHeight,
  },
  introTitle: {
    color: BrandColors.cream,
    fontSize: Typography.title.fontSize,
    fontWeight: '800',
    lineHeight: Typography.title.lineHeight,
    marginTop: Spacing.xs,
  },
  subtitle: {
    color: '#D5DBE7',
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    marginTop: Spacing.sm,
  },
  formCard: {
    backgroundColor: BrandColors.cream,
    borderColor: BrandColors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  photoSection: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  profilePhoto: { backgroundColor: BrandColors.ocean100, borderRadius: Radius.lg, height: 82, width: 82 },
  profilePhotoFallback: {
    alignItems: 'center',
    backgroundColor: BrandColors.ocean100,
    borderRadius: Radius.lg,
    height: 82,
    justifyContent: 'center',
    width: 82,
  },
  profilePhotoInitials: { color: BrandColors.ocean700, fontSize: 24, fontWeight: '900' },
  photoCopy: { alignItems: 'flex-start', flex: 1, gap: Spacing.xs },
  photoModerationText: { color: BrandColors.amber, fontSize: Typography.caption.fontSize, fontWeight: '700' },
  photoModerationRejected: { color: BrandColors.danger },
  photoModerationApproved: { color: BrandColors.teal700 },
  photoModerationReason: { color: BrandColors.charcoal, fontSize: Typography.caption.fontSize, lineHeight: Typography.caption.lineHeight },
  errorBanner: { backgroundColor: BrandColors.dangerSoft, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: BrandColors.danger, fontSize: Typography.label.fontSize, fontWeight: '600' },
  successBanner: { backgroundColor: BrandColors.successSoft, borderColor: BrandColors.teal100, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  successText: { color: BrandColors.teal700, fontSize: Typography.label.fontSize, fontWeight: '700' },
  sectionHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.sm },
  sectionHeadingCopy: { flex: 1 },
  sectionTitle: { color: BrandColors.ink, fontSize: Typography.subheading.fontSize, fontWeight: '800' },
  fieldLabel: { color: BrandColors.ink, fontSize: Typography.label.fontSize, fontWeight: '700' },
  fieldHelp: { color: BrandColors.muted, fontSize: Typography.caption.fontSize, lineHeight: Typography.caption.lineHeight },
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
    backgroundColor: BrandColors.cream,
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
  locationLabel: { marginTop: Spacing.sm },
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
  mapVisibilityTitle: { color: BrandColors.ink, fontSize: Typography.body.fontSize, fontWeight: '700', marginBottom: Spacing.xs },
  pressed: { opacity: 0.78 },
});
