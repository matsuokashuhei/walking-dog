import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '@/lib/i18n';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProviders } from '@/lib/providers';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import {
  getPendingInviteToken,
  deletePendingInviteToken,
} from '@/app/invite/[token]';

function NavigationGuard() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Check for pending invite token from deep link before auth
      getPendingInviteToken().then((token) => {
        if (token) {
          deletePendingInviteToken();
          router.replace(`/invite/${token}`);
        } else {
          router.replace('/(tabs)/walk');
        }
      });
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return null;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isLoading = useAuthStore((s) => s.isLoading);
  const initialize = useAuthStore((s) => s.initialize);
  const networkError = useAuthStore((s) => s.networkError);
  const initializeSettings = useSettingsStore((s) => s.initialize);
  const { t } = useTranslation();

  useEffect(() => {
    initialize();
    initializeSettings();
  }, [initialize, initializeSettings]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (networkError) {
    return <ErrorScreen message={t('auth.error.networkError')} onRetry={initialize} />;
  }

  return (
    <AppProviders>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <NavigationGuard />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="dogs" options={{ headerShown: false }} />
          <Stack.Screen name="walks" options={{ headerShown: false }} />
          <Stack.Screen name="invite" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppProviders>
  );
}
