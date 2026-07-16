import { router } from 'expo-router';
import { LockKeyhole, Mail, Phone, UserRound } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/account/auth-screen';
import {
  formatDominicanPhone,
  getAuthErrorMessage,
  isValidEmail,
  normalizeEmail,
  type FieldErrors,
} from '@/components/account/form-utils';
import { InlineLink } from '@/components/account/inline-link';
import { Button, TextField } from '@/components/ui';
import { BrandColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/providers/auth';

type SignUpField = 'name' | 'email' | 'phone' | 'password' | 'confirmPassword';

export default function SignUpScreen() {
  const { isAuthenticated, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<SignUpField>>({});
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated]);

  const submit = async () => {
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const normalizedEmail = normalizeEmail(email);
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

    setErrors(nextErrors);
    setRequestError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await register({
        accountType: 'user',
        email: normalizedEmail,
        name: normalizedName,
        password,
        phone: phone || undefined,
      });
      router.replace('/');
    } catch (error: unknown) {
      setRequestError(getAuthErrorMessage(error, 'No pudimos crear tu cuenta. Inténtalo de nuevo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Cuenta de cliente"
      title="Encuentra ayuda cerca de ti"
      description="Crea una cuenta para solicitar servicios y consultar todas tus reservas."
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
        helperText="Opcional. Lo usaremos solo para coordinar tus servicios."
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

      <Text style={styles.legalCopy}>
        Al crear tu cuenta aceptas los términos de uso y confirmas que leíste la política de privacidad.
      </Text>

      <Button
        accessibilityHint="Crea una cuenta personal con los datos ingresados"
        disabled={isSubmitting}
        fullWidth
        label="Crear mi cuenta"
        loading={isSubmitting}
        onPress={() => void submit()}
        size="lg"
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
  },
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
});
