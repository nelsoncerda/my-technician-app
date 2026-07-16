import { Search, UserRound, Wrench, X } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSubmitEditingEventData,
} from 'react-native';

import type { Technician } from '@/types/api';
import { createSearchSuggestions, type SearchSuggestion } from '@/lib/search';
import {
  DirectoryColors,
  DirectoryRadius,
  DirectorySpacing,
} from '@/components/technician/tokens';

interface SearchAutocompleteProps {
  value: string;
  technicians: Technician[];
  services: string[];
  onChangeText: (value: string) => void;
  onSelectService: (service: string) => void;
  onSelectTechnician: (technician: Technician) => void;
  onSubmit?: () => void;
}

export function SearchAutocomplete({
  value,
  technicians,
  services,
  onChangeText,
  onSelectService,
  onSelectTechnician,
  onSubmit,
}: SearchAutocompleteProps) {
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(
    () =>
      createSearchSuggestions(value, technicians, { specializations: services }, 5),
    [services, technicians, value]
  );

  const showSuggestions = focused && suggestions.length > 0;

  const cancelBlur = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  };

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    cancelBlur();
    Keyboard.dismiss();
    setFocused(false);
    if (suggestion.type === 'service') {
      onSelectService(suggestion.value);
    } else {
      const technician = technicians.find((candidate) => candidate.id === suggestion.technicianId);
      if (!technician) return;
      onChangeText(suggestion.value);
      onSelectTechnician(technician);
    }
  };

  const handleSubmit = (
    _event: NativeSyntheticEvent<TextInputSubmitEditingEventData>
  ) => {
    Keyboard.dismiss();
    setFocused(false);
    onSubmit?.();
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Servicio o técnico</Text>
      <View style={[styles.inputShell, focused && styles.inputShellFocused]}>
        <Search color={focused ? DirectoryColors.ocean : DirectoryColors.muted} size={21} />
        <TextInput
          accessibilityLabel="Servicio o técnico"
          autoCapitalize="words"
          autoCorrect={false}
          enterKeyHint="search"
          onBlur={() => {
            blurTimer.current = setTimeout(() => setFocused(false), 120);
          }}
          onChangeText={onChangeText}
          onFocus={() => {
            cancelBlur();
            setFocused(true);
          }}
          onSubmitEditing={handleSubmit}
          placeholder="Ej. plomero o nombre"
          placeholderTextColor="#8B929F"
          returnKeyType="search"
          style={styles.input}
          value={value}
        />
        {value.length > 0 ? (
          <Pressable
            accessibilityLabel="Limpiar búsqueda"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onChangeText('')}
            style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
          >
            <X color={DirectoryColors.muted} size={19} />
          </Pressable>
        ) : null}
      </View>

      {showSuggestions ? (
        <View accessibilityLabel="Sugerencias de búsqueda" style={styles.suggestions}>
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.type === 'service' ? Wrench : UserRound;
            return (
              <Pressable
                accessibilityHint={
                  suggestion.type === 'service'
                    ? 'Filtra el directorio por este servicio'
                    : 'Abre el perfil del técnico'
                }
                accessibilityLabel={`${suggestion.label}, ${
                  suggestion.type === 'service' ? 'servicio' : 'técnico'
                }`}
                accessibilityRole="button"
                key={suggestion.id}
                onPress={() => selectSuggestion(suggestion)}
                onPressIn={cancelBlur}
                style={({ pressed }) => [
                  styles.suggestion,
                  index < suggestions.length - 1 && styles.suggestionDivider,
                  pressed && styles.suggestionPressed,
                ]}
              >
                <View style={styles.suggestionIcon}>
                  <Icon color={DirectoryColors.ocean} size={18} />
                </View>
                <View style={styles.suggestionTextWrap}>
                  <Text numberOfLines={1} style={styles.suggestionLabel}>
                    {suggestion.label}
                  </Text>
                  <Text numberOfLines={1} style={styles.suggestionMeta}>
                    {suggestion.type === 'service'
                      ? 'Servicio'
                      : suggestion.description || 'Profesional local'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 20,
  },
  label: {
    color: DirectoryColors.ink,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: DirectorySpacing.sm,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.white,
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: DirectorySpacing.md,
  },
  inputShellFocused: {
    borderColor: DirectoryColors.ocean,
    shadowColor: DirectoryColors.ocean,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  input: {
    color: DirectoryColors.charcoal,
    flex: 1,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  clear: {
    alignItems: 'center',
    borderRadius: DirectoryRadius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  clearPressed: {
    backgroundColor: DirectoryColors.sand,
  },
  suggestions: {
    backgroundColor: DirectoryColors.white,
    borderColor: DirectoryColors.border,
    borderRadius: DirectoryRadius.md,
    borderWidth: 1,
    elevation: 7,
    left: 0,
    marginTop: 6,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    shadowColor: DirectoryColors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    top: 82,
    zIndex: 30,
  },
  suggestion: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: DirectorySpacing.md,
    minHeight: 58,
    paddingHorizontal: DirectorySpacing.md,
    paddingVertical: DirectorySpacing.sm,
  },
  suggestionDivider: {
    borderBottomColor: DirectoryColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionPressed: {
    backgroundColor: DirectoryColors.oceanSoft,
  },
  suggestionIcon: {
    alignItems: 'center',
    backgroundColor: DirectoryColors.oceanSoft,
    borderRadius: DirectoryRadius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionLabel: {
    color: DirectoryColors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  suggestionMeta: {
    color: DirectoryColors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
