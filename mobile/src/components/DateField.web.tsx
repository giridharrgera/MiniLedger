import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { parseDateOnly, toDateOnly } from '../utils/date';

interface DateFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
}

export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = 'miniledger-due-date';

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
        <View style={styles.iconCircle}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        </View>
        <input
          aria-label={label}
          id={inputId}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => {
            const selectedDate = event.target.value;

            if (selectedDate) {
              onChange(parseDateOnly(selectedDate));
            }
          }}
          onFocus={() => setIsFocused(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.ink,
            cursor: 'pointer',
            flex: 1,
            fontFamily: 'inherit',
            fontSize: 15.5,
            fontWeight: 600,
            minHeight: 54,
            outline: 'none',
            padding: 0,
            width: '100%',
          }}
          type="date"
          value={toDateOnly(value)}
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
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  fieldFocused: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    height: 34,
    justifyContent: 'center',
    width: 34,
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
