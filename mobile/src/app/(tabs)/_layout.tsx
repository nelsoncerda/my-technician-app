import { router, Tabs } from 'expo-router';
import { CalendarDays, Search, UserRound } from 'lucide-react-native';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth';

export default function TabsLayout() {
  const { user } = useAuth();
  const limitedAccess = Boolean(
    user?.limitedAccess || user?.accountModerationStatus === 'SUSPENDED'
  );

  useEffect(() => {
    if (limitedAccess) router.replace('/(tabs)/account');
  }, [limitedAccess]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.cream },
        headerShadowVisible: false,
        headerTintColor: Colors.ink,
        headerTitleStyle: { fontWeight: '800' },
        sceneStyle: { backgroundColor: Colors.sand },
        tabBarActiveTintColor: Colors.clay,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          backgroundColor: Colors.cream,
          borderTopColor: Colors.border,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: limitedAccess ? null : undefined,
          title: 'Buscar',
          headerTitle: 'Técnicos en RD',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          href: limitedAccess ? null : undefined,
          title: 'Reservas',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Cuenta',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
