import { ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';
import { useMe } from '@/hooks/use-me';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
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
  const { data: me, isLoading } = useMe();

  if (isLoading || !me) return <LoadingScreen />;

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
