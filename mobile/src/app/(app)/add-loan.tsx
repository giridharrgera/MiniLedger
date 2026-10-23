import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addLoan, getErrorMessage, isUnauthorized } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AppButton } from '../../components/AppButton';
import { DateField } from '../../components/DateField';
import { FormField } from '../../components/FormField';
import { InlineNotice } from '../../components/InlineNotice';
import { useToast } from '../../components/ToastProvider';
import { colors, radius, shadows, spacing } from '../../theme';
import { addDays, toDateOnly } from '../../utils/date';

interface FormErrors {
  friendName?: string;
  amount?: string;
  dueDate?: string;
}

function sanitizeAmountInput(value: string): string {
  const cleaned = value.replace(/,/g, '').replace(/[^\d.]/g, '');
  const dotIndex = cleaned.indexOf('.');

  if (dotIndex === -1) {
    return cleaned.replace(/^0+(?=\d)/, '');
  }

  const whole = (cleaned.slice(0, dotIndex) || '0').replace(/^0+(?=\d)/, '');
  const fraction = cleaned
    .slice(dotIndex + 1)
    .replace(/\./g, '')
    .slice(0, 2);

  return `${whole}.${fraction}`;
}

export default function AddLoanScreen() {
  const { token, signOut } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => addDays(new Date(), 14));
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    const trimmedName = friendName.trim();

    if (!trimmedName) {
      nextErrors.friendName = "Enter your friend's name.";
    } else if (trimmedName.length > 80) {
      nextErrors.friendName = 'Name must be 80 characters or fewer.';
    }

    const numericAmount = Number(amount);

    if (!amount) {
      nextErrors.amount = 'Enter the amount you lent.';
    } else if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(amount)) {
      nextErrors.amount = 'Enter a valid amount with up to two decimals.';
    } else if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      nextErrors.amount = 'Amount must be greater than zero.';
    } else if (numericAmount > 9_999_999_999.99) {
      nextErrors.amount = 'Amount must be ₹99,99,99,999.99 or less.';
    }

    if (Number.isNaN(dueDate.getTime())) {
      nextErrors.dueDate = 'Choose a valid due date.';
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    if (submitting || !token) {
      return;
    }

    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const loan = await addLoan(token, {
        friendName: friendName.trim(),
        amount,
        dueDate: toDateOnly(dueDate),
      });

      showToast({
        message: `${loan.friendName}'s loan was added to your ledger.`,
        tone: 'success',
      });
      goBack();
    } catch (error) {
      if (isUnauthorized(error)) {
        await signOut();
        return;
      }

      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View pointerEvents="none" style={styles.orb} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.navBar}>
              <Pressable
                accessibilityLabel="Go back to dashboard"
                accessibilityRole="button"
                hitSlop={8}
                onPress={goBack}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="arrow-back" size={19} color={colors.ink} />
              </Pressable>
              <Text style={styles.navTitle}>New loan</Text>
              <View style={styles.navSpacer} />
            </View>

            <View style={styles.heading}>
              <Text style={styles.kicker}>NEW ENTRY</Text>
              <Text style={styles.title}>Record a loan</Text>
              <Text style={styles.subtitle}>
                Add the essentials now. Marking it repaid stays one tap away.
              </Text>
            </View>

            <View style={[styles.formCard, shadows.card]}>
              <View style={styles.cardHeading}>
                <View style={styles.cardIcon}>
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Loan details</Text>
                  <Text style={styles.cardCaption}>
                    All amounts are in Indian Rupees
                  </Text>
                </View>
              </View>

              <View style={styles.fields}>
                <FormField
                  autoCapitalize="words"
                  autoCorrect={false}
                  error={errors.friendName}
                  icon="person-outline"
                  label="Friend’s name"
                  maxLength={80}
                  onChangeText={(value) => {
                    setFriendName(value);
                    setErrors((current) => ({
                      ...current,
                      friendName: undefined,
                    }));
                    setFormError(null);
                  }}
                  placeholder="e.g. Ravi Kumar"
                  returnKeyType="next"
                  value={friendName}
                />

                <FormField
                  error={errors.amount}
                  keyboardType="decimal-pad"
                  label="Amount"
                  maxLength={14}
                  onChangeText={(value) => {
                    setAmount(sanitizeAmountInput(value));
                    setErrors((current) => ({
                      ...current,
                      amount: undefined,
                    }));
                    setFormError(null);
                  }}
                  placeholder="0.00"
                  prefix="₹"
                  style={styles.amountInput}
                  value={amount}
                />

                <DateField
                  error={errors.dueDate}
                  label="Due date"
                  onChange={(date) => {
                    setDueDate(date);
                    setErrors((current) => ({
                      ...current,
                      dueDate: undefined,
                    }));
                    setFormError(null);
                  }}
                  value={dueDate}
                />
              </View>

              <View style={styles.repaymentNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.repaymentText}>
                  This version supports full repayment only. You can mark the
                  whole loan repaid from your dashboard.
                </Text>
              </View>

              {formError ? (
                <InlineNotice message={formError} tone="error" />
              ) : null}

              <AppButton
                disabled={submitting}
                icon="checkmark"
                label="Save loan"
                loading={submitting}
                onPress={handleSubmit}
                style={styles.submitButton}
              />
            </View>

            <View style={styles.footerNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={colors.mutedLight}
              />
              <Text style={styles.footerText}>
                Only you can see this entry.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
  },
  orb: {
    backgroundColor: '#E1F0E9',
    borderRadius: 999,
    height: 320,
    opacity: 0.75,
    position: 'absolute',
    right: -160,
    top: -180,
    width: 320,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  container: {
    alignSelf: 'center',
    maxWidth: 560,
    width: '100%',
  },
  navBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  navTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  navSpacer: {
    height: 42,
    width: 42,
  },
  pressed: {
    opacity: 0.75,
  },
  heading: {
    marginBottom: spacing.xxl,
    marginTop: spacing.xxxl,
  },
  kicker: {
    color: colors.primary,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    color: colors.ink,
    fontSize: 31,
    fontWeight: '700',
    letterSpacing: -0.9,
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm,
    maxWidth: 400,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.xl,
    padding: spacing.xl,
  },
  cardHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardCaption: {
    color: colors.muted,
    fontSize: 11.5,
    marginTop: 3,
  },
  fields: {
    gap: spacing.xl,
  },
  amountInput: {
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  repaymentNote: {
    alignItems: 'flex-start',
    backgroundColor: colors.primaryFaint,
    borderColor: '#DBEBE3',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  repaymentText: {
    color: colors.inkSoft,
    flex: 1,
    fontSize: 11.5,
    lineHeight: 18,
  },
  submitButton: {
    marginTop: -2,
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
    fontSize: 11,
  },
});
