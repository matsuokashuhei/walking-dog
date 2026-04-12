import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { useMe } from '@/hooks/use-me';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { EncounterDetectionSection } from '@/components/settings/EncounterDetectionSection';
import { LogoutButton } from '@/components/settings/LogoutButton';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const { data: me, isLoading, error, refetch } = useMe();

  if (isLoading) return <LoadingScreen />;
  if (error || !me) return <ErrorScreen message={t('settings.loadError')} onRetry={refetch} />;

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const appEnv = Constants.expoConfig?.extra?.appEnv as string | undefined;
  const apiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.sectionLabel, { color: theme.onSurfaceVariant }]}>
          {t('settings.sectionLabel')}
        </Text>
        <Text style={[styles.heroTitle, { color: theme.onSurface }]}>
          {t('settings.title')}
        </Text>

        <ProfileSection displayName={me.displayName} />
        <AppearanceSection />
        <EncounterDetectionSection enabled={me.encounterDetectionEnabled} />

        <LogoutButton />

        <Text style={[styles.version, { color: theme.onSurfaceVariant }]}>
          {t('settings.version', { version: appVersion })}
        </Text>
        {appEnv && appEnv !== 'production' && (
          <Text style={[styles.version, { color: theme.onSurfaceVariant }]}>
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
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 44,
    marginBottom: spacing.lg,
  },
  version: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
