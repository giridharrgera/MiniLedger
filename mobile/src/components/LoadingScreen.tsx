import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { BrandMark } from './BrandMark';

export function LoadingScreen({ label = 'Opening your ledger' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.orb} />
      <BrandMark size={54} />
      <Text style={styles.brand}>MiniLedger</Text>
      <View style={styles.loadingRow}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={styles.label}>{label}…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orb: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 420,
    opacity: 0.65,
    position: 'absolute',
    right: -190,
    top: -180,
    width: 420,
  },
  brand: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
  },
});
