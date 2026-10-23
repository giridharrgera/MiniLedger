import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchLoans,
  fetchLoanSummary,
  getErrorMessage,
  isUnauthorized,
  repayLoan,
} from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { BrandMark } from '../../components/BrandMark';
import { InlineNotice } from '../../components/InlineNotice';
import { LoanCard } from '../../components/LoanCard';
import { StatePanel } from '../../components/StatePanel';
import { SummaryCards } from '../../components/SummaryCards';
import { useToast } from '../../components/ToastProvider';
import { colors, radius, shadows, spacing } from '../../theme';
import type { Loan, LoanSummary } from '../../types';
import { confirmAction } from '../../utils/confirm';
import { formatCurrency } from '../../utils/format';

type LoadMode = 'initial' | 'refresh' | 'background';

export default function DashboardScreen() {
  const { token, signOut } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [repayingId, setRepayingId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadData = useCallback(
    async (mode: LoadMode) => {
      if (!token) {
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (mode === 'initial') {
        setLoading(true);
      }
      if (mode === 'refresh') {
        setRefreshing(true);
      }

      setLoadError(null);

      try {
        const [nextLoans, nextSummary] = await Promise.all([
          fetchLoans(token),
          fetchLoanSummary(token),
        ]);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setLoans(nextLoans);
        setSummary(nextSummary);
        hasLoadedRef.current = true;
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (isUnauthorized(error)) {
          await signOut();
          return;
        }

        setLoadError(getErrorMessage(error));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [signOut, token],
  );

  useFocusEffect(
    useCallback(() => {
      void loadData(hasLoadedRef.current ? 'background' : 'initial');
    }, [loadData]),
  );

  const handleRepay = async (loan: Loan) => {
    if (repayingId || !token) {
      return;
    }

    const confirmed = await confirmAction({
      title: 'Mark as repaid?',
      message: `Confirm that ${loan.friendName} has repaid ${formatCurrency(
        loan.amount,
      )} in full. This will close the loan.`,
      confirmLabel: 'Mark repaid',
      cancelLabel: 'Not yet',
    });

    if (!confirmed) {
      return;
    }

    setRepayingId(loan.id);

    try {
      await repayLoan(token, loan.id);
      showToast({
        message: `${loan.friendName}'s loan is now marked as repaid.`,
        tone: 'success',
      });
      await loadData('background');
    } catch (error) {
      if (isUnauthorized(error)) {
        await signOut();
        return;
      }

      showToast({ message: getErrorMessage(error), tone: 'error' });
    } finally {
      setRepayingId(null);
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirmAction({
      title: 'Log out of MiniLedger?',
      message: 'Your ledger stays safe. You can sign back in with your phone number.',
      confirmLabel: 'Log out',
      destructive: true,
    });

    if (confirmed) {
      await signOut();
    }
  };

  const isInitialEmpty = !loading && !loadError && loans.length === 0;

  const header = (
    <View>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <BrandMark size={34} />
          <View>
            <Text style={styles.wordmark}>MiniLedger</Text>
            <Text style={styles.wordmarkCaption}>PERSONAL LEDGER</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.inkSoft} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.pageHeading}>
        <Text style={styles.kicker}>MY OVERVIEW</Text>
        <Text style={styles.pageTitle}>
          Your lending,{'\n'}at a glance.
        </Text>
        <Text style={styles.pageSubtitle}>
          See what’s out, what’s back, and what needs a nudge.
        </Text>
      </View>

      <SummaryCards
        loading={loading && !summary}
        loanCount={loans.length}
        summary={summary}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/add-loan')}
        style={({ pressed }) => [
          styles.addLoanButton,
          shadows.card,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.addIcon}>
          <Ionicons name="add" size={23} color={colors.white} />
        </View>
        <View style={styles.addCopy}>
          <Text style={styles.addTitle}>Add a new loan</Text>
          <Text style={styles.addSubtitle}>Keep a fresh record in seconds</Text>
        </View>
        <View style={styles.addArrow}>
          <Ionicons
            name="arrow-forward"
            size={17}
            color={colors.primary}
          />
        </View>
      </Pressable>

      <View style={styles.sectionHeader}>
        <View>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Your loans</Text>
            {!loading ? (
              <View style={styles.countChip}>
                <Text style={styles.countChipText}>{loans.length}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.sectionSubtitle}>
            {loans.length > 1 ? 'Sorted by urgency' : 'All in one place'}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Refresh loans"
          accessibilityRole="button"
          disabled={refreshing || loading}
          onPress={() => void loadData('refresh')}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.pressed,
          ]}
        >
          {refreshing ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Ionicons name="refresh" size={17} color={colors.primary} />
          )}
        </Pressable>
      </View>

      {loading ? null : loadError && loans.length > 0 ? (
        <InlineNotice
          actionLabel="Retry"
          message={loadError}
          onAction={() => void loadData('refresh')}
          tone="error"
        />
      ) : null}
    </View>
  );

  const emptyOrLoading = () => {
    if (loading) {
      return (
        <StatePanel
          description="Fetching your balances and due dates."
          loading
          title="Loading your ledger"
        />
      );
    }

    if (loadError) {
      return (
        <StatePanel
          actionLabel="Try again"
          description={loadError}
          icon="cloud-offline-outline"
          onAction={() => void loadData('initial')}
          title="Couldn’t load your ledger"
          tone="danger"
        />
      );
    }

    if (isInitialEmpty) {
      return (
        <StatePanel
          actionLabel="Add your first loan"
          description="Track the amount, due date, and repayment status without awkward reminders in the chat."
          icon="receipt-outline"
          onAction={() => router.push('/add-loan')}
          title="Your ledger is empty"
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={loading ? [] : loans}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(loan) => loan.id}
        ListEmptyComponent={emptyOrLoading}
        ListFooterComponent={
          loans.length > 0 ? (
            <View style={styles.footerNote}>
              <Ionicons
                name="lock-closed-outline"
                size={12}
                color={colors.mutedLight}
              />
              <Text style={styles.footerText}>
                Private to your account · Full repayments only
              </Text>
            </View>
          ) : undefined
        }
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => void loadData('refresh')}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <LoanCard
            disabled={repayingId !== null}
            loan={item}
            onRepay={() => void handleRepay(item)}
            repayLoading={repayingId === item.id}
          />
        )}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  list: {
    alignSelf: 'center',
    maxWidth: 720,
    width: '100%',
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wordmark: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  wordmarkCaption: {
    color: colors.mutedLight,
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 2,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  logoutText: {
    color: colors.inkSoft,
    fontSize: 11.5,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.78,
  },
  pageHeading: {
    marginBottom: spacing.xl,
    marginTop: spacing.xxxl,
  },
  kicker: {
    color: colors.primary,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  pageTitle: {
    color: colors.ink,
    fontSize: 31,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 37,
    marginTop: spacing.sm,
  },
  pageSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm,
    maxWidth: 380,
  },
  addLoanButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  addIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 43,
    justifyContent: 'center',
    width: 43,
  },
  addCopy: {
    flex: 1,
    gap: 2,
  },
  addTitle: {
    color: colors.ink,
    fontSize: 14.5,
    fontWeight: '700',
  },
  addSubtitle: {
    color: colors.muted,
    fontSize: 11.5,
  },
  addArrow: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xxl,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  countChip: {
    alignItems: 'center',
    backgroundColor: colors.canvasDeep,
    borderRadius: radius.full,
    minWidth: 23,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  countChipText: {
    color: colors.inkSoft,
    fontSize: 10,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 11.5,
    marginTop: 3,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  separator: {
    height: spacing.md,
  },
  footerNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  footerText: {
    color: colors.mutedLight,
    fontSize: 10.5,
  },
});
