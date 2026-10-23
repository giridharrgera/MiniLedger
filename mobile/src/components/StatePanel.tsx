import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AppButton } from './AppButton';

interface StatePanelProps {
  icon?: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  tone?: 'neutral' | 'danger';
}

export function StatePanel({
  icon = 'receipt-outline',
  title,
  description,
  actionLabel,
  onAction,
  loading = false,
  tone = 'neutral',
}: StatePanelProps) {
  const isDanger = tone === 'danger';

  return (
    <View style={[styles.card, isDanger && styles.dangerCard]}>
      <View
        style={[
          styles.iconCircle,
          isDanger ? styles.dangerIconCircle : styles.neutralIconCircle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Ionicons
            name={icon}
            size={26}
            color={isDanger ? colors.danger : colors.primary}
          />
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  dangerCard: {
    backgroundColor: '#FFFAF9',
    borderColor: colors.dangerBorder,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 58,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 58,
  },
  neutralIconCircle: {
    backgroundColor: colors.primarySoft,
  },
  dangerIconCircle: {
    backgroundColor: colors.dangerSoft,
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 300,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
    minWidth: 160,
  },
});
