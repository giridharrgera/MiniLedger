import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { formatDisplayDate, toDateOnly } from '../utils/date';

interface DateFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
}

export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'set' && date) {
      onChange(date);
    }
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        display: 'calendar',
        onChange: handleChange,
      });
      return;
    }

    setIsOpen((current) => !current);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityLabel={`${label}, ${formatDisplayDate(toDateOnly(value))}`}
        accessibilityRole="button"
        onPress={openPicker}
        style={[
          styles.field,
          isOpen && styles.fieldOpen,
          error ? styles.fieldError : null,
        ]}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        </View>
        <Text style={styles.value}>
          {formatDisplayDate(toDateOnly(value))}
        </Text>
        <View style={styles.trailing}>
          <Text style={styles.trailingText}>Change</Text>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.muted}
          />
        </View>
      </Pressable>

      {isOpen && Platform.OS === 'ios' ? (
        <View style={styles.pickerCard}>
          <DateTimePicker
            accentColor={colors.primary}
            display="inline"
            mode="date"
            onChange={handleChange}
            themeVariant="light"
            value={value}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsOpen(false)}
            style={styles.doneButton}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      ) : null}

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
  fieldOpen: {
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
  value: {
    color: colors.ink,
    flex: 1,
    fontSize: 15.5,
    fontWeight: '600',
  },
  trailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  trailingText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  pickerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  doneButton: {
    alignItems: 'flex-end',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  doneText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
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
