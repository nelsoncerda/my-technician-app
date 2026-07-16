import { router } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/account/auth-screen';
import {
  getAuthErrorMessage,
  isValidEmail,
  normalizeEmail,
} from '@/components/account/form-utils';
import { InlineLink } from '@/components/account/inline-link';
import { Button, TextField } from '@/components/ui';
import { BrandColors, Radius, Spacing, Typography } from '@/constants/theme';
import { api } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const submit = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setEmailError('Ingresa tu correo electrónico.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setEmailError('Ingresa un correo válido.');
      return;
    }

    setEmailError('');
    setRequestError('');
    setIsSubmitting(true);
    try {
      await api.auth.forgotPassword(normalizedEmail);
      setIsSent(true);
    } catch (error: unknown) {
      setRequestError(
        getAuthErrorMessage(error, 'No pudimos procesar la solicitud. Inténtalo de nuevo.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Recupera el acceso"
      title={isSent ? 'Revisa tu correo' : 'Restablece tu contraseña'}
      description={
        isSent
          ? 'Si existe una cuenta con ese correo, recibirás un enlace válido por una hora.'
          : 'Escribe el correo de tu cuenta y te enviaremos instrucciones seguras.'
      }
      footer={
        <InlineLink onPress={() => router.replace('/sign-in')}>
          Volver a iniciar sesión
        </InlineLink>
      }
    >
      {isSent ? (
        <View style={styles.successCard} accessibilityLiveRegion="polite">
          <Mail color={BrandColors.teal700} size={28} accessible={false} />
          <View style={styles.successCopy}>
            <Text style={styles.successTitle}>Solicitud enviada</Text>
            <Text style={styles.successMessage}>{normalizeEmail(email)}</Text>
          </View>
        </View>
      ) : (
        <>
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
            error={emailError}
            keyboardType="email-address"
            label="Correo electrónico"
            leftIcon={<Mail color={BrandColors.muted} size={20} />}
            onChangeText={(value) => {
              setEmail(value);
              if (emailError) setEmailError('');
            }}
            onSubmitEditing={() => void submit()}
            placeholder="tu@correo.com"
            returnKeyType="send"
            textContentType="emailAddress"
            value={email}
          />

          <Button
            accessibilityHint="Envía las instrucciones de recuperación al correo ingresado"
            disabled={isSubmitting}
            fullWidth
            label="Enviar instrucciones"
            loading={isSubmitting}
            onPress={() => void submit()}
            size="lg"
          />
        </>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  successCard: {
    alignItems: 'center',
    backgroundColor: BrandColors.successSoft,
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  successCopy: {
    flex: 1,
  },
  successTitle: {
    color: BrandColors.teal700,
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
  },
  successMessage: {
    color: BrandColors.teal700,
    fontSize: Typography.caption.fontSize,
    marginTop: Spacing.xs,
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
});
