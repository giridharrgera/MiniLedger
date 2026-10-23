import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
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
import { getErrorMessage, requestOtp, verifyOtp } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { BrandMark } from '../components/BrandMark';
import { FormField } from '../components/FormField';
import { InlineNotice } from '../components/InlineNotice';
import { useToast } from '../components/ToastProvider';
import { colors, radius, shadows, spacing } from '../theme';

type LoginStage = 'phone' | 'otp';

function formatPhone(digits: string): string {
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`.trim();
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const [stage, setStage] = useState<LoginStage>('phone');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const phoneNumber = `+91${phoneDigits}`;
  const isBusy = requestLoading || verifyLoading;

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [cooldown]);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setPhoneDigits(digits);
    setPhoneError(null);
    setFormError(null);
  };

  const handleOtpChange = (value: string) => {
    setOtp(value.replace(/\D/g, '').slice(0, 6));
    setOtpError(null);
    setFormError(null);
  };

  const handleRequestOtp = async () => {
    if (phoneDigits.length !== 10) {
      setPhoneError('Enter a valid 10-digit mobile number.');
      return;
    }

    setRequestLoading(true);
    setFormError(null);
    setPhoneError(null);

    try {
      const result = await requestOtp(phoneNumber);
      const wasResend = stage === 'otp';

      setCooldown(result.resendAfterSeconds);
      setStage('otp');
      setOtp('');
      setOtpError(null);

      if (wasResend) {
        showToast({
          message: 'A fresh code was generated. The previous code no longer works.',
          tone: 'info',
        });
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setRequestLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setOtpError('Enter all six digits.');
      return;
    }

    setVerifyLoading(true);
    setFormError(null);
    setOtpError(null);

    try {
      const result = await verifyOtp(phoneNumber, otp);
      await signIn(result.token);
      showToast({ message: 'Welcome to MiniLedger.', tone: 'success' });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStage('phone');
    setOtp('');
    setOtpError(null);
    setFormError(null);
    setCooldown(0);
  };

  const resendLabel =
    cooldown > 0
      ? `Resend in 0:${String(cooldown).padStart(2, '0')}`
      : 'Resend code';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View pointerEvents="none" style={styles.orbTop} />
      <View pointerEvents="none" style={styles.orbBottom} />

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
            <View style={styles.brandRow}>
              <View style={styles.brandLeft}>
                <BrandMark size={38} />
                <Text style={styles.wordmark}>MiniLedger</Text>
              </View>
              <View style={styles.privateChip}>
                <Ionicons
                  name="lock-closed"
                  size={10}
                  color={colors.primary}
                />
                <Text style={styles.privateChipText}>PRIVATE</Text>
              </View>
            </View>

            <View style={styles.hero}>
              <View style={styles.eyebrowPill}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrowText}>PERSONAL LENDING, SIMPLIFIED</Text>
              </View>
              <Text style={styles.heroTitle}>
                Lend with clarity.{'\n'}Stay friends.
              </Text>
              <Text style={styles.heroSubtitle}>
                A calm, clear record of the money you lend to people you trust.
              </Text>
            </View>

            <View style={[styles.card, shadows.card]}>
              <View style={styles.cardHeader}>
                {stage === 'otp' ? (
                  <Pressable
                    accessibilityLabel="Use a different phone number"
                    accessibilityRole="button"
                    hitSlop={10}
                    onPress={handleChangeNumber}
                    style={styles.backButton}
                  >
                    <Ionicons
                      name="arrow-back"
                      size={18}
                      color={colors.inkSoft}
                    />
                  </Pressable>
                ) : (
                  <View style={styles.cardIcon}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                )}

                <View style={styles.cardHeading}>
                  <Text style={styles.cardEyebrow}>
                    {stage === 'phone' ? 'SIGN IN' : 'ONE-TIME CODE'}
                  </Text>
                  <Text style={styles.cardTitle}>
                    {stage === 'phone'
                      ? 'Enter your phone number'
                      : 'Check your code'}
                  </Text>
                </View>
              </View>

              {stage === 'phone' ? (
                <Text style={styles.cardDescription}>
                  We’ll generate a six-digit code. No password to remember.
                </Text>
              ) : (
                <Text style={styles.cardDescription}>
                  Enter the code for{' '}
                  <Text style={styles.phoneEmphasis}>
                    {formatPhone(phoneDigits)}
                  </Text>
                  .
                </Text>
              )}

              <View style={styles.form}>
                {stage === 'phone' ? (
                  <FormField
                    autoComplete="tel"
                    autoFocus
                    error={phoneError ?? undefined}
                    keyboardType="number-pad"
                    label="Phone number"
                    maxLength={10}
                    onChangeText={handlePhoneChange}
                    onSubmitEditing={handleRequestOtp}
                    placeholder="98765 43210"
                    prefix="+91"
                    returnKeyType="done"
                    textContentType="telephoneNumber"
                    value={phoneDigits}
                  />
                ) : (
                  <FormField
                    autoFocus
                    autoComplete="one-time-code"
                    error={otpError ?? undefined}
                    keyboardType="number-pad"
                    label="Six-digit code"
                    maxLength={6}
                    onChangeText={handleOtpChange}
                    onSubmitEditing={handleVerifyOtp}
                    placeholder="000000"
                    returnKeyType="done"
                    style={styles.otpInput}
                    textContentType="oneTimeCode"
                    value={otp}
                  />
                )}

                {formError ? (
                  <InlineNotice message={formError} tone="error" />
                ) : null}

                <AppButton
                  disabled={isBusy}
                  label={stage === 'phone' ? 'Request OTP' : 'Verify & continue'}
                  loading={stage === 'phone' ? requestLoading : verifyLoading}
                  onPress={
                    stage === 'phone' ? handleRequestOtp : handleVerifyOtp
                  }
                />

                {stage === 'otp' ? (
                  <>
                    <View style={styles.resendRow}>
                      <Text style={styles.resendPrompt}>
                        Didn’t receive a code?
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        disabled={cooldown > 0 || isBusy}
                        hitSlop={8}
                        onPress={handleRequestOtp}
                      >
                        <Text
                          style={[
                            styles.resendAction,
                            (cooldown > 0 || isBusy) &&
                              styles.resendActionDisabled,
                          ]}
                        >
                          {resendLabel}
                        </Text>
                      </Pressable>
                    </View>

                    <InlineNotice
                      message="Demo mode · Your six-digit code appears in the API terminal."
                      tone="info"
                    />
                  </>
                ) : (
                  <View style={styles.securityNote}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={16}
                      color={colors.muted}
                    />
                    <Text style={styles.securityText}>
                      Your ledger is tied to your verified number.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.footer}>
              <Ionicons
                name="leaf-outline"
                size={14}
                color={colors.mutedLight}
              />
              <Text style={styles.footerText}>
                Simple records. Clearer friendships.
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
  orbTop: {
    backgroundColor: '#DDEFE7',
    borderRadius: 999,
    height: 360,
    opacity: 0.78,
    position: 'absolute',
    right: -170,
    top: -190,
    width: 360,
  },
  orbBottom: {
    backgroundColor: '#E8F1EC',
    borderRadius: 999,
    bottom: -170,
    height: 330,
    left: -190,
    opacity: 0.7,
    position: 'absolute',
    width: 330,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  container: {
    alignSelf: 'center',
    maxWidth: 480,
    width: '100%',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  wordmark: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  privateChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  privateChipText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  hero: {
    marginBottom: spacing.xxl,
    marginTop: spacing.xxxl,
  },
  eyebrowPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryFaint,
    borderColor: '#DCEBE4',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  eyebrowDot: {
    backgroundColor: colors.primaryBright,
    borderRadius: radius.full,
    height: 6,
    width: 6,
  },
  eyebrowText: {
    color: colors.primaryDeep,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 35,
    fontWeight: '700',
    letterSpacing: -1.25,
    lineHeight: 41,
    marginTop: spacing.lg,
  },
  heroSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.md,
    maxWidth: 360,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardHeading: {
    flex: 1,
    gap: 3,
  },
  cardEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  cardDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  phoneEmphasis: {
    color: colors.inkSoft,
    fontWeight: '600',
  },
  form: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  otpInput: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 9,
    textAlign: 'center',
  },
  resendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    marginTop: -2,
  },
  resendPrompt: {
    color: colors.muted,
    fontSize: 12.5,
  },
  resendAction: {
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  resendActionDisabled: {
    color: colors.mutedLight,
  },
  securityNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  securityText: {
    color: colors.muted,
    fontSize: 11.5,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  footerText: {
    color: colors.mutedLight,
    fontSize: 11.5,
  },
});
