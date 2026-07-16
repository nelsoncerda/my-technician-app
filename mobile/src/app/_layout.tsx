import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/providers/auth';

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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
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
