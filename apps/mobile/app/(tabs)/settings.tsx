import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { useMe } from '@/hooks/use-me';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { ProfileCard } from '@/components/settings/ProfileCard';
import { PreferencesSection } from '@/components/settings/PreferencesSection';
import { LegalSection } from '@/components/settings/LegalSection';
import { SignOutRow } from '@/components/settings/SignOutRow';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const { data: me, isLoading, error, refetch } = useMe();

  if (isLoading) return <LoadingScreen />;
  if (error || !me) return <ErrorScreen message={t('settings.loadError')} onRetry={refetch} />;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.heroTitle, { color: theme.onSurface }]}>
          {t('settings.title')}
        </Text>

        <ProfileCard displayName={me.displayName} />
        <PreferencesSection />
        <LegalSection />
        <SignOutRow />
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
  heroTitle: {
    ...typography.largeTitle,
    marginBottom: spacing.lg,
  },
});
