import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Easing, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'info';

type ToastOptions = {
  type?: ToastType;
  durationMs?: number;
  loading?: boolean; // show spinner
  persistent?: boolean; // do not auto-hide
};

type ToastContextValue = {
  show: (message: string, options?: ToastOptions) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<string>('');
  const [type, setType] = useState<ToastType>('info');
  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPersistent, setIsPersistent] = useState(false);
  const insets = useSafeAreaInsets();

  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);
  const inAnim = useRef<Animated.CompositeAnimation | null>(null);
  const outAnim = useRef<Animated.CompositeAnimation | null>(null);

  const hide = useCallback(() => {
    if (inAnim.current) {
      inAnim.current.stop();
      inAnim.current = null;
    }
    outAnim.current = Animated.timing(opacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    });
    outAnim.current.start(() => setVisible(false));
  }, [opacity]);

  const show = useCallback((msg: string, options?: ToastOptions) => {
    const durationMs = options?.durationMs ?? 2200;
    setMessage(msg);
    setType(options?.type ?? 'info');
    setIsLoading(!!options?.loading);
    setIsPersistent(!!options?.persistent);

    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    if (outAnim.current) { outAnim.current.stop(); outAnim.current = null; }
    if (inAnim.current) { inAnim.current.stop(); inAnim.current = null; }

    // Ensure first frame is fully transparent before mount
    opacity.setValue(0);
    setVisible(true);

    // Start fade on next frame to avoid flash on mount
    requestAnimationFrame(() => {
      inAnim.current = Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      });
      inAnim.current.start();
    });

    if (!options?.persistent) {
      hideTimeout.current = setTimeout(hide, durationMs);
    }
  }, [hide, opacity]);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {visible && (
        <View pointerEvents="none" style={styles.overlay}>
          <Animated.View
            style={[ styles.toast, styles[type], { marginTop: (insets.top || 0) + 8, opacity } ]}
          >
            <View style={styles.row}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
              ) : null}
              <Text style={styles.text}>{message}</Text>
            </View>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    maxWidth: '92%',
    // Tasteful shadows that still perform well
    shadowColor: '#000',
    shadowOpacity: Platform.OS === 'ios' ? 0.18 : 0,
    shadowRadius: Platform.OS === 'ios' ? 6 : 0,
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 3 : 0 },
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 14,
  },
  success: { backgroundColor: '#4e7d32' },
  error: { backgroundColor: '#c62828' },
  info: { backgroundColor: '#3c7d68' },
});
