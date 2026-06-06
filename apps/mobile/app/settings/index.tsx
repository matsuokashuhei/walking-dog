import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LegalSection } from '@/components/settings/LegalSection';
import { PreferencesSection } from '@/components/settings/PreferencesSection';
import { SignOutRow } from '@/components/settings/SignOutRow';
import { useColors } from '@/hooks/use-colors';
import { useSettingsScreenViewModel } from '@/hooks/use-settings-screen-view-model';
import { spacing } from '@/theme/tokens';

// User タブから一段下がった設定画面として、表示設定・法務リンク・サインアウト導線をまとめます。
export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const vm = useSettingsScreenViewModel();

  if (vm.status === 'loading') return <LoadingScreen />;
  if (vm.status === 'error') {
    return <ErrorScreen message={t('settings.loadError')} onRetry={vm.handleRetry} />;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        variant="inline"
        title={t('settings.settingsTitle')}
        leftAction="back"
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
});
