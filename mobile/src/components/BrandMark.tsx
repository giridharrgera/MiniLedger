import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.31),
        },
      ]}
    >
      <Ionicons name="wallet" size={Math.round(size * 0.5)} color={colors.white} />
      <View
        style={[
          styles.spark,
          {
            width: Math.round(size * 0.24),
            height: Math.round(size * 0.24),
            borderRadius: size,
            right: -Math.round(size * 0.05),
            top: -Math.round(size * 0.04),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  spark: {
    backgroundColor: '#A7EBCC',
    borderColor: colors.canvas,
    borderWidth: 2,
    position: 'absolute',
  },
});
