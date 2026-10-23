import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { colors, radius, spacing } from '../theme';

interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  prefix?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<TextStyle>;
}

export function FormField({
  label,
  error,
  prefix,
  icon,
  style,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...inputProps
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          isFocused && styles.fieldFocused,
          error ? styles.fieldError : null,
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={19} color={colors.muted} />
        ) : null}
        {prefix ? (
          <View style={styles.prefixGroup}>
            <Text style={styles.prefix}>{prefix}</Text>
            <View style={styles.prefixDivider} />
          </View>
        ) : null}
        <TextInput
          {...inputProps}
          accessibilityLabel={accessibilityLabel ?? label}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor={colors.mutedLight}
          selectionColor={colors.primary}
          style={[styles.input, style]}
        />
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  field: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  fieldFocused: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  prefixGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  prefix: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  prefixDivider: {
    backgroundColor: colors.borderStrong,
    height: 20,
    width: 1,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    minHeight: 52,
    paddingVertical: 0,
  },
  errorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
  },
});
