import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { GroupedRow } from '@/components/ui/GroupedRow';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { dogContactChrome, spacing, typography } from '@/theme/tokens';
import { useUserScreenViewModel } from '@/hooks/use-user-screen-view-model';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorScreen } from '@/components/ui/ErrorScreen';
import { ContactChromeButton } from '@/components/ui/ContactChromeButton';
import { UserSummary } from '@/components/user/UserSummary';

// User タブはユーザー自身の散歩貢献を最初に見せ、設定は下部リンクから開きます。
export default function UserScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const vm = useUserScreenViewModel();

  if (vm.status === 'loading') return <LoadingScreen />;
  if (vm.status === 'error') {
    return <ErrorScreen message={t('user.loadError')} onRetry={vm.handleRetry} />;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View testID="settings-header">
        <View testID="settings-header-action-row" style={styles.headerActionRow}>
          <View testID="settings-header-left-action-slot" style={styles.headerActionSlot} />
          <View testID="settings-header-right-action-slot" style={styles.headerActionSlot}>
            <ContactChromeButton
              shape="pill"
              label={t('user.edit')}
              accessibilityLabel={t('user.edit')}
              onPress={() => router.push('/user/edit')}
              testID="user-edit-button"
            />
          </View>
        </View>
        <View testID="settings-header-large-title-row" style={styles.largeTitleRow}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[styles.largeTitle, { color: theme.onSurface }]}
          >
            {t('settings.title')}
          </Text>
        </View>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <UserSummary
          user={vm}
          footer={
            <>
              <GroupedCard elevated={false} style={styles.accountActionsCard}>
                <GroupedRow
                  leading={<IconSymbol name="envelope.fill" size={18} color={theme.interactive} />}
                  label={t('user.account.changeEmail')}
                  testID="account-change-email"
                  onPress={() => router.push('/settings/email')}
                  separator={false}
                />
              </GroupedCard>
              <GroupedCard elevated={false} style={styles.settingsLinkCard}>
                <GroupedRow
                  leading={<IconSymbol name="gearshape.fill" size={18} color={theme.interactive} />}
                  label={t('settings.openSettings')}
                  onPress={() => router.push('/settings')}
                  separator={false}
                />
              </GroupedCard>
            </>
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerActionRow: {
    height: dogContactChrome.circleSize,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActionSlot: {
    minWidth: dogContactChrome.pillMinWidth,
  },
  largeTitleRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.step6,
    paddingBottom: spacing.step10,
  },
  largeTitle: {
    ...typography.largeTitle,
  },
  container: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  accountActionsCard: {
    marginTop: spacing.lg,
  },
  settingsLinkCard: {
    marginTop: spacing.md,
  },
});
