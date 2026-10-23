import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type NoticeTone = 'error' | 'info' | 'success';

interface InlineNoticeProps {
  message: string;
  tone?: NoticeTone;
  actionLabel?: string;
  onAction?: () => void;
}

const tones = {
  error: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    color: colors.dangerDeep,
    icon: 'alert-circle' as const,
  },
  info: {
    backgroundColor: colors.primaryFaint,
    borderColor: '#D9EAE2',
    color: colors.primaryDeep,
    icon: 'information-circle' as const,
  },
  success: {
    backgroundColor: '#EBF8F1',
    borderColor: '#CBE9DA',
    color: colors.primaryDeep,
    icon: 'checkmark-circle' as const,
  },
};

export function InlineNotice({
  message,
  tone = 'info',
  actionLabel,
  onAction,
}: InlineNoticeProps) {
  const palette = tones[tone];

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
    >
      <Ionicons name={palette.icon} size={18} color={palette.color} />
      <Text style={[styles.message, { color: palette.color }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
        >
          <Text style={[styles.action, { color: palette.color }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  message: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  action: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
