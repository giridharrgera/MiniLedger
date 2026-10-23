import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const variantStyles = {
  primary: {
    button: { backgroundColor: colors.primary },
    text: { color: colors.white },
    spinner: colors.white,
  },
  secondary: {
    button: {
      backgroundColor: colors.primarySoft,
      borderColor: '#CAE6D9',
      borderWidth: 1,
    },
    text: { color: colors.primaryDeep },
    spinner: colors.primary,
  },
  ghost: {
    button: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
      borderWidth: 1,
    },
    text: { color: colors.inkSoft },
    spinner: colors.primary,
  },
} satisfies Record<ButtonVariant, unknown>;

export function AppButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  style,
  testID,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const palette = variantStyles[variant];

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        palette.button,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={palette.spinner} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={19} color={palette.text.color} />
      ) : null}
      <Text style={[styles.label, palette.text]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
