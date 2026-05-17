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
import { nativeStackHeader } from '@/theme/overrides';

// 認証状態と現在の route group を見て、ログイン画面とアプリ本体の行き先を制御します。
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
      router.replace('/(tabs)/walk');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return null;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

// ルートレイアウトは provider、テーマ、認証ガード、主要 Stack 構成をまとめます。
function RootLayout() {
  const colorScheme = useColorScheme();
  const isLoading = useAuthStore((s) => s.isLoading);
  const initialize = useAuthStore((s) => s.initialize);
  const networkError = useAuthStore((s) => s.networkError);
  const initializeSettings = useSettingsStore((s) => s.initialize);
  const { t } = useTranslation();

  useEffect(() => {
    // アプリ起動時に認証情報と設定を復元し、以降の画面が同じ前提で動けるようにします。
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
          <Stack.Screen
            name="walk-recording"
            options={{ headerShown: false, animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="walk-recording-controls"
            options={{
              headerShown: false,
              presentation: 'formSheet',
              // 記録操作はマップ上に重ねるため、form sheet の高さだけをこの route で固定します。
              sheetAllowedDetents: [0.15, 0.45],
              sheetInitialDetentIndex: 1,
              sheetGrabberVisible: true,
              sheetCornerRadius: nativeStackHeader.sheetCornerRadius,
              gestureEnabled: false,
              contentStyle: { backgroundColor: nativeStackHeader.transparentBackground },
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppProviders>
  );
}

export default RootLayout;
