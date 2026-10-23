import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../theme';
import type { LoanSummary } from '../types';
import { formatCurrency } from '../utils/format';

interface SummaryCardsProps {
  summary: LoanSummary | null;
  loanCount: number;
  loading: boolean;
}

export function SummaryCards({
  summary,
  loanCount,
  loading,
}: SummaryCardsProps) {
  const hasOverdue = Number(summary?.overdueAmount ?? 0) > 0;
  const isUnavailable = !loading && !summary;
  const totalLent = loading || !summary ? '—' : formatCurrency(summary.totalLent);
  const totalRepaid =
    loading || !summary ? '—' : formatCurrency(summary.totalRepaid);
  const overdueAmount =
    loading || !summary ? '—' : formatCurrency(summary.overdueAmount);
  const ledgerLabel =
    loanCount === 0
      ? 'No loans recorded yet'
      : `Across ${loanCount} ${loanCount === 1 ? 'loan' : 'loans'}`;
  const mainFooter = loading
    ? 'Calculating your balance…'
    : isUnavailable
      ? 'Totals unavailable'
      : ledgerLabel;
  const miniFooter = loading
    ? 'Loading totals'
    : isUnavailable
      ? 'Not available'
      : null;

  return (
    <View style={styles.container}>
      <View
        accessible
        accessibilityLabel={
          isUnavailable
            ? 'Total lent unavailable.'
            : `Total lent ${totalLent}. ${ledgerLabel}.`
        }
        style={[styles.mainCard, shadows.raised]}
      >
        <View pointerEvents="none" style={styles.ringLarge} />
        <View pointerEvents="none" style={styles.ringSmall} />

        <View style={styles.mainTopRow}>
          <View>
            <Text style={styles.mainEyebrow}>TOTAL LENT</Text>
            <Text style={styles.mainCaption}>Your complete ledger</Text>
          </View>
          <View style={styles.mainIcon}>
            <Ionicons name="arrow-up-outline" size={18} color={colors.white} />
          </View>
        </View>

        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.58}
          numberOfLines={1}
          style={styles.mainValue}
        >
          {totalLent}
        </Text>

        <View style={styles.mainFooter}>
          <View style={styles.liveDot} />
          <Text numberOfLines={1} style={styles.mainFooterText}>
            {mainFooter}
          </Text>
        </View>
      </View>

      <View style={styles.miniRow}>
        <View
          accessible
          accessibilityLabel={`Total repaid ${totalRepaid}.`}
          style={[styles.miniCard, shadows.card]}
        >
          <View style={styles.miniHeader}>
            <View style={styles.repaidIcon}>
              <Ionicons
                name="checkmark"
                size={15}
                color={colors.primary}
              />
            </View>
            <Text style={styles.miniLabel}>Repaid</Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={1}
            style={styles.miniValue}
          >
            {totalRepaid}
          </Text>
          <Text style={styles.miniFoot}>
            {miniFooter ??
              (!Number(summary?.totalRepaid)
                ? 'Nothing received yet'
                : 'Received back')}
          </Text>
        </View>

        <View
          accessible
          accessibilityLabel={`Overdue amount ${overdueAmount}.`}
          style={[
            styles.miniCard,
            shadows.card,
            hasOverdue && styles.overdueCard,
          ]}
        >
          <View style={styles.miniHeader}>
            <View
              style={[
                styles.dangerIcon,
                hasOverdue && styles.dangerIconActive,
              ]}
            >
              <Ionicons
                name="time-outline"
                size={15}
                color={hasOverdue ? colors.danger : colors.muted}
              />
            </View>
            <Text
              style={[styles.miniLabel, hasOverdue && styles.overdueLabel]}
            >
              Overdue
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={1}
            style={[styles.miniValue, hasOverdue && styles.overdueValue]}
          >
            {overdueAmount}
          </Text>
          <Text
            style={[styles.miniFoot, hasOverdue && styles.overdueLabel]}
            numberOfLines={1}
          >
            {miniFooter ?? (hasOverdue ? 'Needs attention' : 'All caught up')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  mainCard: {
    backgroundColor: colors.primaryDeep,
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: spacing.xl,
    position: 'relative',
  },
  ringLarge: {
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 140,
    borderWidth: 1,
    height: 210,
    position: 'absolute',
    right: -74,
    top: -66,
    width: 210,
  },
  ringSmall: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 80,
    borderWidth: 1,
    height: 120,
    position: 'absolute',
    right: -28,
    top: -20,
    width: 120,
  },
  mainTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mainEyebrow: {
    color: '#A7E1C8',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  mainCaption: {
    color: 'rgba(255, 255, 255, 0.64)',
    fontSize: 12.5,
    marginTop: 5,
  },
  mainIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  mainValue: {
    color: colors.white,
    fontSize: 37,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -1.2,
    marginTop: spacing.xl,
  },
  mainFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: spacing.md,
  },
  liveDot: {
    backgroundColor: '#7EE2B2',
    borderRadius: radius.full,
    height: 6,
    width: 6,
  },
  mainFooterText: {
    color: 'rgba(255, 255, 255, 0.72)',
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  miniRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  miniCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    padding: spacing.lg,
  },
  overdueCard: {
    backgroundColor: '#FFF8F7',
    borderColor: colors.dangerBorder,
  },
  miniHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  repaidIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  dangerIcon: {
    alignItems: 'center',
    backgroundColor: colors.canvasDeep,
    borderRadius: radius.full,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  dangerIconActive: {
    backgroundColor: colors.dangerSoft,
  },
  miniLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  overdueLabel: {
    color: colors.danger,
  },
  miniValue: {
    color: colors.ink,
    fontSize: 21,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  overdueValue: {
    color: colors.dangerDeep,
  },
  miniFoot: {
    color: colors.muted,
    fontSize: 10.5,
    marginTop: 5,
  },
});
