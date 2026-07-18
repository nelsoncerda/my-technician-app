import { List, MapPinned } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TechnicianMapProps } from './TechnicianMap.types';
import { DirectoryColors, DirectoryRadius, DirectorySpacing } from './tokens';

/** Web-safe fallback. Native platforms resolve TechnicianMap.native.tsx instead. */
export function TechnicianMap({ technicians, onSwitchToList }: TechnicianMapProps) {
  return (
    <View accessibilityRole="summary" style={styles.panel}>
      <View style={styles.iconWrap}>
        <MapPinned color={DirectoryColors.ocean} size={27} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        El mapa está disponible en la app móvil
      </Text>
      <Text style={styles.description}>
        Puedes seguir comparando {technicians.length === 1 ? 'este perfil' : 'estos perfiles'} en
        la vista de lista.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onSwitchToList}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <List color={DirectoryColors.white} size={18} />
        <Text style={styles.buttonText}>Ver lista</Text>
      </Pressable>
    </View>
  );
}

export type { TechnicianMapProps } from './TechnicianMap.types';

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.cream,
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.lg,
    borderWidth: 1,
    marginHorizontal: DirectorySpacing.lg,
    minHeight: 340,
    paddingHorizontal: DirectorySpacing.xxl,
    paddingVertical: 54,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.oceanSoft,
    borderRadius: DirectoryRadius.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  title: {
    color: DirectoryColors.ink,
    fontSize: 19,
    fontWeight: '900',
    marginTop: DirectorySpacing.lg,
    textAlign: 'center',
  },
  description: {
    color: DirectoryColors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: DirectorySpacing.sm,
    maxWidth: 330,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.ocean,
    borderRadius: DirectoryRadius.md,
    flexDirection: 'row',
    gap: DirectorySpacing.sm,
    justifyContent: 'center',
    marginTop: DirectorySpacing.xl,
    minHeight: 48,
    paddingHorizontal: DirectorySpacing.xl,
  },
  buttonPressed: {
    backgroundColor: DirectoryColors.oceanDark,
  },
  buttonText: {
    color: DirectoryColors.white,
    fontSize: 14,
    fontWeight: '900',
  },
});
