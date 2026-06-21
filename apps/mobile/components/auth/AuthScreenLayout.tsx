import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppMark } from '@/components/auth/AppMark';
import { useColors } from '@/hooks/use-colors';
import { layout, spacing, typography } from '@/theme/tokens';

interface AuthScreenLayoutProps {
  heading: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  topAction?: ReactNode;
  showAppMark?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function AuthScreenLayout({
  heading,
  subtitle,
  children,
  footer,
  topAction,
  showAppMark = false,
  contentStyle,
}: AuthScreenLayoutProps) {
  const theme = useColors();
  const { height: windowHeight } = useWindowDimensions();
  const formRef = useRef<View>(null);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [formFrame, setFormFrame] = useState({ y: 0, height: 0 });

  const measureForm = useCallback(() => {
    requestAnimationFrame(() => {
      formRef.current?.measureInWindow((_x, y, _width, height) => {
        setFormFrame({ y, height });
      });
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      measureForm();
      setKeyboardTop(event.endCoordinates.screenY);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardTop(null);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [measureForm]);

  const formBottom = formFrame.y + formFrame.height;
  const keyboardOverlap = Math.max(
    0,
    formBottom + spacing.md - (keyboardTop ?? windowHeight),
  );

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <View style={styles.container}>
        {topAction ? <View style={styles.topAction}>{topAction}</View> : null}
        <View
          style={[
            styles.content,
            topAction ? styles.contentAfterTopAction : styles.contentFromTop,
            contentStyle,
          ]}
        >
          <View style={styles.hero}>
            {showAppMark ? <View style={styles.mark}><AppMark /></View> : null}
            <Text style={[styles.heading, { color: theme.onSurface }]}>
              {heading}
            </Text>
            <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>
              {subtitle}
            </Text>
          </View>
          <View
            ref={formRef}
            onLayout={measureForm}
            style={[
              styles.form,
              { transform: [{ translateY: -keyboardOverlap }] },
            ]}
          >
            {children}
          </View>
        </View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  topAction: {
    height: layout.navBar,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
  },
  contentFromTop: {
    paddingTop: spacing.step60,
  },
  contentAfterTopAction: {
    paddingTop: spacing.md,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  mark: {
    marginBottom: spacing.lg,
  },
  heading: {
    ...typography.largeTitle,
    letterSpacing: spacing.none,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.subheadline,
  },
  form: {
    width: '100%',
  },
  footer: {
    minHeight: layout.safeBottom,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
});
