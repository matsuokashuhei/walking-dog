import Constants from 'expo-constants';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeFieldRow, NativeFieldSection } from '@/components/ui/NativeFieldGroup';
import { useColors } from '@/hooks/use-colors';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/lib/legal-urls';
import { spacing } from '@/theme/tokens';

export function LegalSection() {
  const { t } = useTranslation();
  const theme = useColors();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  function openTerms() {
    void Linking.openURL(TERMS_URL);
  }

  function openPrivacy() {
    void Linking.openURL(PRIVACY_POLICY_URL);
  }

  return (
    <View style={styles.wrapper}>
      <NativeFieldSection title={t('settings.sectionLabel.legal')}>
        <NativeFieldRow
          icon="terms"
          iconColor={theme.onSurfaceVariant}
          label={t('settings.terms')}
          onPress={openTerms}
        />
        <NativeFieldRow
          icon="privacy"
          iconColor={theme.onSurfaceVariant}
          label={t('settings.privacy')}
          onPress={openPrivacy}
        />
        <NativeFieldRow
          icon="about"
          iconColor={theme.onSurfaceVariant}
          label={t('settings.about')}
          value={`v${version}`}
          showChevron
        />
      </NativeFieldSection>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
});
