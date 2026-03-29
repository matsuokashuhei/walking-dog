import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';
import { useMe } from '@/hooks/use-me';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { ThemedText } from '@/components/themed-text';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { DogListSection } from '@/components/settings/DogListSection';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { LogoutButton } from '@/components/settings/LogoutButton';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: me, isLoading, error, refetch } = useMe();

  if (isLoading) return <LoadingScreen />;
  if (error || !me) return <ErrorScreen message={t('settings.loadError')} onRetry={refetch} />;

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const appEnv = Constants.expoConfig?.extra?.appEnv as string | undefined;
  const apiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <ThemedText type="title" style={styles.title}>
          {t('settings.title')}
        </ThemedText>

        <ProfileSection displayName={me.displayName} />
        <DogListSection dogs={me.dogs} />
        <AppearanceSection />

        <LogoutButton />

        <Text style={[styles.version, { color: colors.textSecondary }]}>
          {t('settings.version', { version: appVersion })}
        </Text>
        {appEnv && appEnv !== 'production' && (
          <Text style={[styles.version, { color: colors.textSecondary }]}>
            {appEnv} — {apiUrl}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    marginBottom: spacing.lg,
  },
  version: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
