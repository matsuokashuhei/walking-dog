import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppMark } from '@/components/auth/AppMark';
import { EmailAuthForm } from '@/components/auth/EmailAuthForm';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

// 認証画面はメールOTPフォームだけを担当し、成功後の遷移はルートの認証ガードに任せます。
export default function LoginScreen() {
  const { t } = useTranslation();
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
  const keyboardGap = spacing.md;
  const keyboardOverlap = Math.max(
    0,
    formBottom + keyboardGap - (keyboardTop ?? windowHeight),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <AppMark />
          <Text style={[styles.heading, { color: theme.onSurface }]}>
            {t('auth.login.heading')}
          </Text>
          <Text style={[styles.sub, { color: theme.onSurfaceVariant }]}>
            {t('auth.login.subtitle')}
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
          <EmailAuthForm
            onSuccess={() => {
              // 認証後の遷移は _layout.tsx の NavigationGuard が一元管理します。
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
  },
  heading: {
    ...typography.largeTitle,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sub: {
    ...typography.subheadline,
  },
  form: {
    width: '100%',
  },
});
