import { Check, LocateFixed } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DirectoryColors,
  DirectoryRadius,
  DirectorySpacing,
} from '@/components/technician/tokens';

interface LocationActionProps {
  enabled: boolean;
  loading: boolean;
  message?: string | null;
  messageTone?: 'error' | 'info';
  onPress: () => void;
}

export function LocationAction({
  enabled,
  loading,
  message,
  messageTone = 'error',
  onPress,
}: LocationActionProps) {
  return (
    <View>
      <Pressable
        accessibilityHint="Solicita permiso para usar el GPS mientras utilizas la aplicación"
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: loading }}
        disabled={loading}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          enabled && styles.enabledButton,
          pressed && !loading && styles.pressed,
        ]}
      >
        <View style={[styles.icon, enabled && styles.enabledIcon]}>
          {enabled ? (
            <Check color={DirectoryColors.tealDark} size={17} strokeWidth={3} />
          ) : (
            <LocateFixed color={DirectoryColors.ocean} size={18} />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, enabled && styles.enabledTitle]}>
            {loading ? 'Obteniendo tu ubicación…' : enabled ? 'Ubicación lista' : 'Usar mi ubicación'}
          </Text>
          <Text style={styles.description}>
            {enabled
              ? 'Podrás usarla al confirmar la dirección del servicio.'
              : 'Activa el GPS solo mientras usas la aplicación.'}
          </Text>
        </View>
      </Pressable>
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.message, messageTone === 'info' && styles.infoMessage]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.oceanSoft,
    borderColor: '#CEE3EE',
    borderRadius: DirectoryRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: DirectorySpacing.md,
    minHeight: 58,
    paddingHorizontal: DirectorySpacing.md,
    paddingVertical: DirectorySpacing.sm,
  },
  enabledButton: {
    backgroundColor: DirectoryColors.tealSoft,
    borderColor: '#BCE0D9',
  },
  pressed: {
    opacity: 0.82,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.white,
    borderRadius: DirectoryRadius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  enabledIcon: {
    backgroundColor: '#F4FBF9',
  },
  copy: {
    flex: 1,
  },
  title: {
    color: DirectoryColors.oceanDark,
    fontSize: 13,
    fontWeight: '900',
  },
  enabledTitle: {
    color: DirectoryColors.tealDark,
  },
  description: {
    color: DirectoryColors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  message: {
    color: DirectoryColors.danger,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  infoMessage: {
    color: DirectoryColors.tealDark,
  },
});
