import Constants from 'expo-constants';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { GroupedRow } from '@/components/ui/GroupedRow';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/ui/SectionHeader';
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
      <SectionHeader label={t('settings.sectionLabel.legal')} />
      <GroupedCard elevated={false}>
        <GroupedRow
          leading={
            <IconSymbol name="doc.text" size={18} color={theme.onSurfaceVariant} />
          }
          label={t('settings.terms')}
          onPress={openTerms}
        />
        <GroupedRow
          leading={
            <IconSymbol name="lock.fill" size={18} color={theme.onSurfaceVariant} />
          }
          label={t('settings.privacy')}
          onPress={openPrivacy}
        />
        <GroupedRow
          leading={
            <IconSymbol name="info.circle" size={18} color={theme.onSurfaceVariant} />
          }
          label={t('settings.about')}
          value={`v${version}`}
          showChevron
          separator={false}
        />
      </GroupedCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
});
