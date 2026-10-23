import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../theme';
import type { Loan } from '../types';
import {
  daysUntil,
  dueDescription,
  formatDisplayDate,
  formatTimestampDate,
} from '../utils/date';
import { formatCurrency, getAvatarPalette, getInitials } from '../utils/format';

interface LoanCardProps {
  loan: Loan;
  onRepay: () => void;
  repayLoading: boolean;
  disabled: boolean;
}

export function LoanCard({
  loan,
  onRepay,
  repayLoading,
  disabled,
}: LoanCardProps) {
  const isRepaid = loan.status === 'repaid';
  const days = daysUntil(loan.dueDate);
  const isOverdue = !isRepaid && days < 0;
  const isDueToday = !isRepaid && days === 0;
  const avatar = getAvatarPalette(loan.friendName);

  return (
    <View
      style={[
        styles.card,
        isOverdue && styles.overdueCard,
        isRepaid && styles.repaidCard,
      ]}
      testID={`loan-${loan.id}`}
    >
      <View style={styles.topRow}>
        <View style={[styles.avatar, { backgroundColor: avatar.backgroundColor }]}>
          <Text style={[styles.avatarText, { color: avatar.textColor }]}>
            {getInitials(loan.friendName)}
          </Text>
        </View>
        <View style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>
            {loan.friendName}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.dueText,
              isOverdue && styles.overdueText,
              isDueToday && styles.warningText,
            ]}
          >
            {isRepaid && loan.repaidAt
              ? `Repaid ${formatTimestampDate(loan.repaidAt)}`
              : `Due ${formatDisplayDate(loan.dueDate)} · ${dueDescription(loan.dueDate)}`}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            isOverdue
              ? styles.overdueBadge
              : isRepaid
                ? styles.repaidBadge
                : isDueToday
                  ? styles.warningBadge
                  : styles.unpaidBadge,
          ]}
        >
          {isRepaid ? (
            <Ionicons name="checkmark" size={11} color={colors.primary} />
          ) : (
            <View
              style={[
                styles.badgeDot,
                {
                  backgroundColor: isOverdue
                    ? colors.danger
                    : isDueToday
                      ? colors.warning
                      : colors.primary,
                },
              ]}
            />
          )}
          <Text
            style={[
              styles.badgeText,
              isOverdue
                ? styles.overdueText
                : isRepaid
                  ? styles.repaidText
                  : isDueToday
                    ? styles.warningText
                    : styles.unpaidText,
            ]}
          >
            {isRepaid ? 'Repaid' : isOverdue ? 'Overdue' : 'Unpaid'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={[styles.amount, isRepaid && styles.repaidAmount]}>
            {formatCurrency(loan.amount)}
          </Text>
        </View>

        {isRepaid ? (
          <View style={styles.settled}>
            <Ionicons
              name="checkmark-circle"
              size={17}
              color={colors.primary}
            />
            <Text style={styles.settledText}>Settled</Text>
          </View>
        ) : (
          <Pressable
            accessibilityLabel={`Mark loan from ${loan.friendName} as repaid`}
            accessibilityRole="button"
            accessibilityState={{ busy: repayLoading, disabled }}
            disabled={disabled}
            onPress={onRepay}
            style={({ pressed }) => [
              styles.repayButton,
              pressed && !disabled && styles.repayButtonPressed,
              disabled && !repayLoading && styles.repayButtonDisabled,
            ]}
          >
            {repayLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="checkmark" size={15} color={colors.white} />
            )}
            <Text style={styles.repayButtonText}>Mark repaid</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftColor: '#CFE5D9',
    borderLeftWidth: 3,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  overdueCard: {
    backgroundColor: '#FFF9F8',
    borderColor: colors.dangerBorder,
    borderLeftColor: colors.danger,
  },
  repaidCard: {
    backgroundColor: '#F8FBF9',
    borderColor: '#E3ECE7',
    borderLeftColor: '#D7E8DF',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 43,
    justifyContent: 'center',
    width: 43,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  identity: {
    flex: 1,
    gap: 5,
  },
  name: {
    color: colors.ink,
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  dueText: {
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 16,
  },
  overdueText: {
    color: colors.danger,
  },
  warningText: {
    color: colors.warning,
  },
  badge: {
    alignItems: 'center',
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  unpaidBadge: {
    backgroundColor: colors.primarySoft,
  },
  repaidBadge: {
    backgroundColor: colors.primarySoft,
  },
  overdueBadge: {
    backgroundColor: colors.dangerSoft,
  },
  warningBadge: {
    backgroundColor: colors.warningSoft,
  },
  badgeDot: {
    borderRadius: radius.full,
    height: 5,
    width: 5,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  unpaidText: {
    color: colors.primary,
  },
  repaidText: {
    color: colors.primary,
  },
  divider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.lg,
  },
  bottomRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountLabel: {
    color: colors.muted,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  amount: {
    color: colors.ink,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  repaidAmount: {
    color: colors.inkSoft,
  },
  repayButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 112,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  repayButtonPressed: {
    backgroundColor: colors.primaryDeep,
  },
  repayButtonDisabled: {
    opacity: 0.55,
  },
  repayButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  settled: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingBottom: 5,
    paddingRight: 2,
  },
  settledText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
