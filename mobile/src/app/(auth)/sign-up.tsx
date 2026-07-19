import { router } from 'expo-router';
import {
  BriefcaseBusiness,
  Building2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Wrench,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/account/auth-screen';
import {
  formatDominicanPhone,
  getAuthErrorMessage,
  isValidEmail,
  normalizeEmail,
  type FieldErrors,
} from '@/components/account/form-utils';
import { InlineLink } from '@/components/account/inline-link';
import { CommunityConsentCard } from '@/components/moderation';
import { Button, TextField } from '@/components/ui';
import { BrandColors, Radius, Spacing, Typography } from '@/constants/theme';
import { api } from '@/lib/api';
import { COMMUNITY_TERMS_VERSION } from '@/lib/moderation-api';
import { useAuth } from '@/providers/auth';
import type { RegisterInput, Settings } from '@/types/api';

type SignUpField =
  | 'name'
  | 'email'
  | 'phone'
  | 'password'
  | 'confirmPassword'
  | 'specializations'
  | 'location'
  | 'companyName'
  | 'communityTerms';

const EMPTY_SETTINGS: Settings = { locations: [], specializations: [] };

export default function SignUpScreen() {
  const { isAuthenticated, register } = useAuth();
  const [accountType, setAccountType] = useState<RegisterInput['accountType']>('user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [communityTermsAccepted, setCommunityTermsAccepted] = useState(false);
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState('');
  const [errors, setErrors] = useState<FieldErrors<SignUpField>>({});
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated]);

  const selectAccountType = (nextType: RegisterInput['accountType']) => {
    setAccountType(nextType);
    setRequestError('');
    setErrors((current) => ({
      ...current,
      specializations: undefined,
      location: undefined,
      companyName: undefined,
    }));
  };

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
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const normalizedEmail = normalizeEmail(email);
    const normalizedCompanyName = companyName.trim().replace(/\s+/g, ' ');
    const nextErrors: FieldErrors<SignUpField> = {};

    if (normalizedName.length < 3) nextErrors.name = 'Ingresa tu nombre completo.';
    if (!normalizedEmail) nextErrors.email = 'Ingresa tu correo electrónico.';
    else if (!isValidEmail(normalizedEmail)) nextErrors.email = 'Ingresa un correo válido.';
    if (phone && !/^\d{3}-\d{3}-\d{4}$/.test(phone)) {
      nextErrors.phone = 'Completa los 10 dígitos del teléfono.';
    }
    if (password.length < 8) nextErrors.password = 'Usa al menos 8 caracteres.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Confirma tu contraseña.';
    else if (password !== confirmPassword) nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    if (!communityTermsAccepted) {
      nextErrors.communityTerms = 'Debes aceptar las normas para crear tu cuenta.';
    }
    if (accountType === 'technician') {
      if (specializations.length === 0) {
        nextErrors.specializations = 'Selecciona al menos una especialidad.';
      }
      if (!location) nextErrors.location = 'Selecciona tu zona de servicio.';
      if (normalizedCompanyName.length > 120) {
        nextErrors.companyName = 'Usa 120 caracteres o menos.';
      }
      if (settingsError) {
        setRequestError('Vuelve a cargar las opciones profesionales antes de continuar.');
      }
    }

    setErrors(nextErrors);
    if (!(accountType === 'technician' && settingsError)) setRequestError('');
    if (Object.keys(nextErrors).length > 0 || (accountType === 'technician' && settingsError)) return;

    setIsSubmitting(true);
    try {
      await register({
        accountType,
        email: normalizedEmail,
        name: normalizedName,
        password,
        phone: phone || undefined,
        ugcTermsAccepted: true,
        ugcTermsVersion: COMMUNITY_TERMS_VERSION,
        ...(accountType === 'technician' && {
          specializations,
          location,
          companyName: normalizedCompanyName || undefined,
        }),
      });
      router.replace('/');
    } catch (error: unknown) {
      setRequestError(getAuthErrorMessage(error, 'No pudimos crear tu cuenta. Inténtalo de nuevo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProfessional = accountType === 'technician';

  return (
    <AuthScreen
      eyebrow={isProfessional ? 'Cuenta profesional' : 'Cuenta de cliente'}
      title={isProfessional ? 'Publica tus servicios locales' : 'Encuentra ayuda cerca de ti'}
      description={isProfessional
        ? 'Crea un perfil para recibir solicitudes y organizar tus trabajos.'
        : 'Crea una cuenta para solicitar servicios y consultar todas tus reservas.'}
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerCopy}>¿Ya tienes una cuenta?</Text>
          <InlineLink onPress={() => router.replace('/sign-in')}>Iniciar sesión</InlineLink>
          <View style={styles.legalPrompt}>
            <InlineLink onPress={() => router.push('/legal/privacy')}>
              Política de privacidad
            </InlineLink>
            <InlineLink onPress={() => router.push('/legal/terms')}>
              Términos de uso
            </InlineLink>
          </View>
        </View>
      }
    >
      <View>
        <Text style={styles.fieldLabel}>¿Cómo usarás Técnicos en RD?</Text>
        <View style={styles.accountTypeGroup}>
          <AccountTypeButton
            description="Quiero contratar servicios"
            icon={UserRound}
            label="Cliente"
            onPress={() => selectAccountType('user')}
            selected={!isProfessional}
          />
          <AccountTypeButton
            description="Quiero ofrecer servicios"
            icon={BriefcaseBusiness}
            label="Profesional"
            onPress={() => selectAccountType('technician')}
            selected={isProfessional}
          />
        </View>
      </View>

      {requestError ? (
        <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
          <Text style={styles.errorText} role="alert">{requestError}</Text>
        </View>
      ) : null}

      <TextField
        autoCapitalize="words"
        autoComplete="name"
        editable={!isSubmitting}
        error={errors.name}
        label="Nombre completo"
        leftIcon={<UserRound color={BrandColors.muted} size={20} />}
        onChangeText={(value) => {
          setName(value);
          if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
        }}
        placeholder="Nombre y apellido"
        returnKeyType="next"
        textContentType="name"
        value={name}
      />

      <TextField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        editable={!isSubmitting}
        error={errors.email}
        keyboardType="email-address"
        label="Correo electrónico"
        leftIcon={<Mail color={BrandColors.muted} size={20} />}
        onChangeText={(value) => {
          setEmail(value);
          if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
        }}
        placeholder="tu@correo.com"
        returnKeyType="next"
        textContentType="emailAddress"
        value={email}
      />

      <TextField
        autoComplete="tel"
        editable={!isSubmitting}
        error={errors.phone}
        helperText={isProfessional
          ? 'Los clientes podrán usarlo después de reservar.'
          : 'Opcional. Lo usaremos solo para coordinar tus servicios.'}
        keyboardType="phone-pad"
        label="Teléfono"
        leftIcon={<Phone color={BrandColors.muted} size={20} />}
        maxLength={18}
        onChangeText={(value) => {
          setPhone(formatDominicanPhone(value));
          if (errors.phone) setErrors((current) => ({ ...current, phone: undefined }));
        }}
        placeholder="809-555-0123"
        returnKeyType="next"
        textContentType="telephoneNumber"
        value={phone}
      />

      {isProfessional ? (
        <View style={styles.professionalFields}>
          <View>
            <Text style={styles.fieldLabel}>Especialidades</Text>
            <Text style={styles.fieldHelp}>Selecciona entre 1 y 10 servicios que ofreces.</Text>
            {isLoadingSettings ? (
              <Text style={styles.loadingCopy}>Cargando especialidades…</Text>
            ) : settingsError ? (
              <View style={styles.settingsErrorCard}>
                <Text style={styles.errorText}>{settingsError}</Text>
                <Button label="Reintentar" onPress={() => void loadSettings()} size="sm" variant="outline" />
              </View>
            ) : (
              <View style={styles.choiceWrap}>
                {settings.specializations.map((specialization) => (
                  <ChoiceChip
                    key={specialization}
                    label={specialization}
                    onPress={() => toggleSpecialization(specialization)}
                    selected={specializations.includes(specialization)}
                  />
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
            returnKeyType="next"
            value={companyName}
          />
        </View>
      ) : null}

      <TextField
        autoCapitalize="none"
        autoComplete="new-password"
        editable={!isSubmitting}
        error={errors.password}
        helperText="Mínimo 8 caracteres."
        label="Contraseña"
        leftIcon={<LockKeyhole color={BrandColors.muted} size={20} />}
        onChangeText={(value) => {
          setPassword(value);
          if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
        }}
        returnKeyType="next"
        secureTextEntry
        textContentType="newPassword"
        value={password}
      />

      <TextField
        autoCapitalize="none"
        autoComplete="new-password"
        editable={!isSubmitting}
        error={errors.confirmPassword}
        label="Confirmar contraseña"
        leftIcon={<LockKeyhole color={BrandColors.muted} size={20} />}
        onChangeText={(value) => {
          setConfirmPassword(value);
          if (errors.confirmPassword) {
            setErrors((current) => ({ ...current, confirmPassword: undefined }));
          }
        }}
        onSubmitEditing={() => void submit()}
        returnKeyType="done"
        secureTextEntry
        textContentType="newPassword"
        value={confirmPassword}
      />

      <CommunityConsentCard
        checked={communityTermsAccepted}
        disabled={isSubmitting}
        error={errors.communityTerms}
        onChange={(checked) => {
          setCommunityTermsAccepted(checked);
          if (errors.communityTerms) {
            setErrors((current) => ({ ...current, communityTerms: undefined }));
          }
        }}
      />

      <Text style={styles.legalCopy}>
        También confirmas que leíste la política de privacidad.
      </Text>

      <Button
        accessibilityHint={isProfessional
          ? 'Crea una cuenta profesional con los servicios y zona seleccionados'
          : 'Crea una cuenta personal con los datos ingresados'}
        disabled={isSubmitting || (isProfessional && isLoadingSettings)}
        fullWidth
        label={isProfessional ? 'Crear perfil profesional' : 'Crear mi cuenta'}
        leftIcon={<Wrench color={BrandColors.cream} size={20} accessible={false} />}
        loading={isSubmitting}
        onPress={() => void submit()}
        size="lg"
      />
    </AuthScreen>
  );
}

function AccountTypeButton({
  description,
  icon: Icon,
  label,
  onPress,
  selected,
}: {
  description: string;
  icon: typeof UserRound;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.accountTypeButton,
        selected && styles.accountTypeButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      <Icon color={selected ? BrandColors.clay600 : BrandColors.ocean500} size={24} accessible={false} />
      <Text style={[styles.accountTypeLabel, selected && styles.accountTypeLabelSelected]}>{label}</Text>
      <Text style={styles.accountTypeDescription}>{description}</Text>
    </Pressable>
  );
}

function ChoiceChip({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        selected && styles.choiceChipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center' },
  footerCopy: {
    color: BrandColors.muted,
    fontSize: Typography.body.fontSize,
    textAlign: 'center',
  },
  legalPrompt: {
    alignItems: 'center',
    borderTopColor: BrandColors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  errorBanner: {
    backgroundColor: BrandColors.dangerSoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorText: {
    color: BrandColors.danger,
    fontSize: Typography.label.fontSize,
    fontWeight: '600',
  },
  legalCopy: {
    color: BrandColors.muted,
    fontSize: Typography.caption.fontSize,
    lineHeight: Typography.caption.lineHeight,
  },
  fieldLabel: {
    color: BrandColors.ink,
    fontSize: Typography.label.fontSize,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  fieldHelp: {
    color: BrandColors.muted,
    fontSize: Typography.caption.fontSize,
    lineHeight: Typography.caption.lineHeight,
    marginBottom: Spacing.sm,
  },
  fieldError: {
    color: BrandColors.danger,
    fontSize: Typography.caption.fontSize,
    marginTop: Spacing.xs,
  },
  accountTypeGroup: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  accountTypeButton: {
    alignItems: 'flex-start',
    backgroundColor: BrandColors.cream,
    borderColor: BrandColors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 112,
    padding: Spacing.md,
  },
  accountTypeButtonSelected: {
    backgroundColor: BrandColors.clay50,
    borderColor: BrandColors.clay600,
    borderWidth: 2,
    padding: Spacing.md - 1,
  },
  accountTypeLabel: {
    color: BrandColors.ink,
    fontSize: Typography.body.fontSize,
    fontWeight: '800',
    marginTop: Spacing.sm,
  },
  accountTypeLabelSelected: { color: BrandColors.clay700 },
  accountTypeDescription: {
    color: BrandColors.muted,
    fontSize: Typography.caption.fontSize,
    lineHeight: Typography.caption.lineHeight,
    marginTop: 2,
  },
  professionalFields: { gap: Spacing.md },
  loadingCopy: {
    color: BrandColors.muted,
    fontSize: Typography.body.fontSize,
    paddingVertical: Spacing.md,
  },
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
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  choiceChipSelected: { backgroundColor: BrandColors.clay50, borderColor: BrandColors.clay600 },
  choiceChipText: { color: BrandColors.charcoal, fontSize: Typography.label.fontSize, fontWeight: '600' },
  choiceChipTextSelected: { color: BrandColors.clay700 },
  locationList: { gap: Spacing.sm },
  locationChoice: {
    alignItems: 'center',
    backgroundColor: BrandColors.cream,
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
  pressed: { opacity: 0.78 },
});
