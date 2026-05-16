import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';
import { useSettingsScreenViewModel } from '@/hooks/use-settings-screen-view-model';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ProfileCard } from '@/components/settings/ProfileCard';
import { PreferencesSection } from '@/components/settings/PreferencesSection';
import { LegalSection } from '@/components/settings/LegalSection';
import { SignOutRow } from '@/components/settings/SignOutRow';

// 設定タブはプロフィール、表示設定、法務リンク、サインアウト導線をまとめます。
export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useColors();
  const vm = useSettingsScreenViewModel();

  if (vm.status === 'loading') return <LoadingScreen />;
  if (vm.status === 'error') {
    // 設定の取得に失敗した場合は、同じ view-model の再試行だけを許可します。
    return <ErrorScreen message={t('settings.loadError')} onRetry={vm.handleRetry} />;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t('settings.title')} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ProfileCard displayName={vm.me.name ?? vm.me.displayName ?? null} />
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
