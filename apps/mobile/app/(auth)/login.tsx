import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LoginForm } from '@/components/auth/LoginForm';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, fontFamily } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.brandSection}>
            <View
              style={[
                styles.logoContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              <MaterialCommunityIcons
                name="paw"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.heading, { color: colors.text }]}>
              {t('auth.login.heading')}
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
            >
              {t('auth.login.welcomeBack')}
            </Text>
          </View>

          <LoginForm
            onSuccess={() => {
              // Navigation guard in _layout.tsx handles redirect to (tabs)
            }}
            onRegisterPress={() =>
              router.push('/(auth)/register' as never)
            }
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t('auth.login.subtitle')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  content: {
    maxWidth: 384,
    width: '100%',
    alignSelf: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: 30,
    fontFamily: fontFamily.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontFamily: fontFamily.regular,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
