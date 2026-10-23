import Ionicons from '@expo/vector-icons/Ionicons';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadows, spacing } from '../theme';

type ToastTone = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  tone?: ToastTone;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

interface ToastState {
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<
  ToastTone,
  { backgroundColor: string; icon: keyof typeof Ionicons.glyphMap; accent: string }
> = {
  success: {
    backgroundColor: colors.primaryDeep,
    icon: 'checkmark-circle',
    accent: '#8BE0BB',
  },
  error: {
    backgroundColor: colors.dangerDeep,
    icon: 'alert-circle',
    accent: '#FFD2CF',
  },
  info: {
    backgroundColor: colors.ink,
    icon: 'information-circle',
    accent: '#BFE3D7',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const insets = useSafeAreaInsets();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    ({ message, tone = 'success' }: ToastOptions) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setToast({ message, tone });
      timeoutRef.current = setTimeout(() => {
        setToast(null);
        timeoutRef.current = null;
      }, 3800);
    },
    [],
  );

  useEffect(() => dismiss, [dismiss]);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  const toastStyle: StyleProp<ViewStyle> = toast
    ? [
        styles.toast,
        {
          backgroundColor: toneStyles[toast.tone].backgroundColor,
          bottom: insets.bottom + spacing.xl,
        },
        shadows.raised,
      ]
    : undefined;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={styles.layer}>
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={toastStyle}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: toneStyles[toast.tone].accent },
              ]}
            >
              <Ionicons
                name={toneStyles[toast.tone].icon}
                size={18}
                color={toneStyles[toast.tone].backgroundColor}
              />
            </View>
            <Text style={styles.message}>{toast.message}</Text>
            <Pressable
              accessibilityLabel="Dismiss notification"
              accessibilityRole="button"
              hitSlop={10}
              onPress={dismiss}
            >
              <Ionicons name="close" size={20} color={colors.white} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider.');
  }

  return context;
}

const styles = StyleSheet.create({
  layer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
  },
  toast: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    maxWidth: 560,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  message: {
    color: colors.white,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
