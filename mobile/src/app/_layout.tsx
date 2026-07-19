import { DefaultTheme, router, Stack, ThemeProvider, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/providers/auth';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.clay,
    background: Colors.sand,
    card: Colors.cream,
    text: Colors.ink,
    border: Colors.border,
    notification: Colors.clay,
  },
};

function SuspendedSessionGuard() {
  const pathname = usePathname();
  const { user } = useAuth();
  const limitedAccess = Boolean(
    user?.limitedAccess || user?.accountModerationStatus === 'SUSPENDED'
  );

  useEffect(() => {
    if (!limitedAccess) return;
    const allowed = [
      '/account',
      '/moderation/reports',
      '/legal/privacy',
      '/legal/terms',
    ].some((path) => pathname === path || pathname.endsWith(path));
    if (!allowed) router.replace('/(tabs)/account');
  }, [limitedAccess, pathname]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SuspendedSessionGuard />
          <ThemeProvider value={navigationTheme}>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerBackButtonDisplayMode: 'minimal',
                headerStyle: { backgroundColor: Colors.cream },
                headerTintColor: Colors.ink,
                headerTitleStyle: { fontWeight: '800' },
                contentStyle: { backgroundColor: Colors.sand },
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="technician/[id]"
                options={{ title: 'Perfil del técnico' }}
              />
              <Stack.Screen
                name="booking/[technicianId]"
                options={{ title: 'Solicitar servicio', presentation: 'modal' }}
              />
              <Stack.Screen
                name="booking-detail/[id]"
                options={{ title: 'Detalle de reserva' }}
              />
              <Stack.Screen
                name="availability"
                options={{ title: 'Disponibilidad semanal' }}
              />
              <Stack.Screen
                name="gamification"
                options={{ title: 'Puntos y recompensas' }}
              />
              <Stack.Screen
                name="admin"
                options={{ title: 'Administración' }}
              />
              <Stack.Screen
                name="about"
                options={{ title: 'Cómo funciona' }}
              />
              <Stack.Screen
                name="profile/edit"
                options={{ title: 'Editar perfil' }}
              />
              <Stack.Screen
                name="profile/history"
                options={{ title: 'Historial del perfil' }}
              />
              <Stack.Screen
                name="profile/become-technician"
                options={{ title: 'Ofrecer servicios' }}
              />
              <Stack.Screen
                name="moderation/report"
                options={{ title: 'Reportar contenido', presentation: 'modal' }}
              />
              <Stack.Screen
                name="moderation/blocked"
                options={{ title: 'Usuarios bloqueados' }}
              />
              <Stack.Screen
                name="moderation/reports"
                options={{ title: 'Mis reportes' }}
              />
              <Stack.Screen
                name="(auth)/sign-in"
                options={{ title: 'Entrar', presentation: 'modal' }}
              />
              <Stack.Screen
                name="(auth)/sign-up"
                options={{ title: 'Crear cuenta', presentation: 'modal' }}
              />
              <Stack.Screen
                name="(auth)/forgot-password"
                options={{ title: 'Recuperar contraseña', presentation: 'modal' }}
              />
              <Stack.Screen
                name="legal/privacy"
                options={{ title: 'Privacidad' }}
              />
              <Stack.Screen
                name="legal/terms"
                options={{ title: 'Términos de uso' }}
              />
            </Stack>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
