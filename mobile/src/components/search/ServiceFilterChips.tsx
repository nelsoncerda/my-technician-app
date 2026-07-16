import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DirectoryColors,
  DirectoryRadius,
  DirectorySpacing,
} from '@/components/technician/tokens';

interface ServiceFilterChipsProps {
  services: string[];
  selectedService: string;
  onSelect: (service: string) => void;
}

export function ServiceFilterChips({
  services,
  selectedService,
  onSelect,
}: ServiceFilterChipsProps) {
  if (!services.length) return null;

  return (
    <View>
      <Text style={styles.label}>Filtrar por servicio</Text>
      <ScrollView
        contentContainerStyle={styles.content}
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        <FilterChip
          label="Todos"
          onPress={() => onSelect('')}
          selected={!selectedService}
        />
        {services.map((service) => (
          <FilterChip
            key={service}
            label={service}
            onPress={() => onSelect(service === selectedService ? '' : service)}
            selected={service === selectedService}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && (selected ? styles.chipSelectedPressed : styles.chipPressed),
      ]}
    >
      <Text numberOfLines={1} style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    color: DirectoryColors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: DirectorySpacing.sm,
  },
  content: {
    gap: DirectorySpacing.sm,
    paddingRight: DirectorySpacing.lg,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.cream,
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: DirectorySpacing.lg,
  },
  chipSelected: {
    backgroundColor: DirectoryColors.ink,
    borderColor: DirectoryColors.ink,
  },
  chipPressed: {
    backgroundColor: DirectoryColors.sand,
  },
  chipSelectedPressed: {
    backgroundColor: '#263655',
  },
  chipText: {
    color: DirectoryColors.charcoal,
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 190,
  },
  chipTextSelected: {
    color: DirectoryColors.white,
  },
});
