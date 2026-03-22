import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/use-auth';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{t('settings.title')}</ThemedText>
      <Button
        label={t('settings.signOut')}
        variant="destructive"
        onPress={signOut}
        style={styles.signOutButton}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  signOutButton: {
    marginTop: 32,
    width: '100%',
  },
});
