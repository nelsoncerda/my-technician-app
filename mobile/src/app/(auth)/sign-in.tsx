import { router, useLocalSearchParams } from 'expo-router';
import { LockKeyhole, Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/account/auth-screen';
import {
  getAuthErrorMessage,
  isValidEmail,
  normalizeEmail,
  type FieldErrors,
} from '@/components/account/form-utils';
import { InlineLink } from '@/components/account/inline-link';
import { Button, TextField } from '@/components/ui';
import { BrandColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/providers/auth';

type LoginField = 'email' | 'password';

export default function SignInScreen() {
  const { registered } = useLocalSearchParams<{ registered?: string }>();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({});
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated]);

  const submit = async () => {
    const normalizedEmail = normalizeEmail(email);
    const nextErrors: FieldErrors<LoginField> = {};
    if (!normalizedEmail) nextErrors.email = 'Ingresa tu correo electrónico.';
    else if (!isValidEmail(normalizedEmail)) nextErrors.email = 'Ingresa un correo válido.';
    if (!password) nextErrors.password = 'Ingresa tu contraseña.';

    setErrors(nextErrors);
    setRequestError('');
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await login(normalizedEmail, password);
      router.replace('/');
    } catch (error: unknown) {
      setRequestError(getAuthErrorMessage(error, 'No pudimos iniciar sesión. Inténtalo de nuevo.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Tu cuenta"
      title="Bienvenido de nuevo"
      description="Entra para administrar tus reservas y contactar técnicos con seguridad."
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerCopy}>¿Todavía no tienes cuenta?</Text>
          <InlineLink onPress={() => router.push('/sign-up')}>Crear cuenta</InlineLink>
        </View>
      }
    >
      {registered === '1' ? (
        <View style={styles.successBanner} accessibilityLiveRegion="polite">
          <Text style={styles.successText}>Tu cuenta fue creada. Ya puedes iniciar sesión.</Text>
        </View>
      ) : null}

      {requestError ? (
        <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
          <Text style={styles.errorText} role="alert">{requestError}</Text>
        </View>
      ) : null}

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
        autoCapitalize="none"
        autoComplete="current-password"
        editable={!isSubmitting}
        error={errors.password}
        label="Contraseña"
        leftIcon={<LockKeyhole color={BrandColors.muted} size={20} />}
        onChangeText={(value) => {
          setPassword(value);
          if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
        }}
        onSubmitEditing={() => void submit()}
        returnKeyType="go"
        secureTextEntry
        textContentType="password"
        value={password}
      />

      <View style={styles.forgotLink}>
        <InlineLink onPress={() => router.push('/forgot-password')}>
          Olvidé mi contraseña
        </InlineLink>
      </View>

      <Button
        accessibilityHint="Inicia sesión con el correo y contraseña ingresados"
        disabled={isSubmitting}
        fullWidth
        label="Iniciar sesión"
        loading={isSubmitting}
        onPress={() => void submit()}
        size="lg"
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footerRow: {
    alignItems: 'center',
  },
  footerCopy: {
    color: BrandColors.muted,
    fontSize: Typography.body.fontSize,
  },
  forgotLink: {
    alignItems: 'flex-end',
    marginTop: -Spacing.sm,
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
  successBanner: {
    backgroundColor: BrandColors.successSoft,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  successText: {
    color: BrandColors.teal700,
    fontSize: Typography.label.fontSize,
    fontWeight: '600',
  },
});
