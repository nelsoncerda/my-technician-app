import { RefreshCw, SearchX, WifiOff } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { DirectoryColors, DirectoryRadius, DirectorySpacing } from './tokens';

interface StatePanelProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  kind: 'error' | 'empty';
}

function StatePanel({
  title,
  description,
  actionLabel,
  onAction,
  kind,
}: StatePanelProps) {
  const Icon = kind === 'error' ? WifiOff : SearchX;

  return (
    <View style={styles.panel} accessibilityRole="summary">
      <View style={[styles.iconWrap, kind === 'error' && styles.errorIconWrap]}>
        <Icon
          color={kind === 'error' ? DirectoryColors.danger : DirectoryColors.ocean}
          size={26}
          strokeWidth={2}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          {kind === 'error' && <RefreshCw color={DirectoryColors.white} size={17} />}
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function DirectoryLoading() {
  return (
    <View style={styles.loading} accessibilityLabel="Cargando técnicos" accessibilityRole="progressbar">
      <ActivityIndicator color={DirectoryColors.clay} size="large" />
      <Text style={styles.loadingText}>Buscando profesionales disponibles…</Text>
    </View>
  );
}

interface DirectoryErrorProps {
  onRetry: () => void;
}

export function DirectoryError({ onRetry }: DirectoryErrorProps) {
  return (
    <StatePanel
      actionLabel="Intentar de nuevo"
      description="Revisa tu conexión. Tus filtros se mantendrán mientras vuelves a intentar."
      kind="error"
      onAction={onRetry}
      title="No pudimos cargar los técnicos"
    />
  );
}

interface DirectoryEmptyProps {
  hasFilters: boolean;
  onReset: () => void;
}

export function DirectoryEmpty({ hasFilters, onReset }: DirectoryEmptyProps) {
  return (
    <StatePanel
      actionLabel={hasFilters ? 'Limpiar búsqueda' : undefined}
      description={
        hasFilters
          ? 'Prueba otro servicio, nombre o zona para ampliar los resultados.'
          : 'Aún no hay perfiles publicados. Vuelve a revisar muy pronto.'
      }
      kind="empty"
      onAction={hasFilters ? onReset : undefined}
      title={hasFilters ? 'No encontramos coincidencias' : 'Próximamente habrá técnicos aquí'}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    gap: DirectorySpacing.md,
    paddingHorizontal: DirectorySpacing.xxl,
    paddingVertical: 52,
  },
  loadingText: {
    color: DirectoryColors.muted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  panel: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.cream,
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.lg,
    borderWidth: 1,
    marginTop: DirectorySpacing.sm,
    paddingHorizontal: DirectorySpacing.xxl,
    paddingVertical: 36,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.oceanSoft,
    borderRadius: DirectoryRadius.pill,
    height: 52,
    justifyContent: 'center',
    marginBottom: DirectorySpacing.lg,
    width: 52,
  },
  errorIconWrap: {
    backgroundColor: DirectoryColors.dangerSoft,
  },
  title: {
    color: DirectoryColors.ink,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: DirectoryColors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: DirectorySpacing.sm,
    maxWidth: 310,
    textAlign: 'center',
  },
  action: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.clay,
    borderRadius: DirectoryRadius.md,
    flexDirection: 'row',
    gap: DirectorySpacing.sm,
    justifyContent: 'center',
    marginTop: DirectorySpacing.xl,
    minHeight: 46,
    paddingHorizontal: DirectorySpacing.xl,
  },
  actionPressed: {
    backgroundColor: DirectoryColors.clayDark,
    transform: [{ scale: 0.98 }],
  },
  actionText: {
    color: DirectoryColors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
