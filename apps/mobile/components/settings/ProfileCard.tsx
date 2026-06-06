import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfileCardProps {
  displayName: string | null;
  avatarUrl: string | null;
  onPress: () => void;
}

export function ProfileCard({ displayName, avatarUrl, onPress }: ProfileCardProps) {
  const { t } = useTranslation();
  const theme = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('settings.viewProfile')}
      onPress={onPress}
    >
      <GroupedCard padding="md" elevated={false} style={styles.card}>
        <View style={styles.row}>
          <ProfileAvatar
            displayName={displayName}
            avatarUrl={avatarUrl}
            size="card"
            testID="settings-profile-card-avatar"
          />
          <View style={styles.textBlock}>
            <Text style={[styles.name, { color: theme.onSurface }]} numberOfLines={1}>
              {displayName ?? '-'}
            </Text>
            <Text style={[styles.link, { color: theme.interactive }]}>
              {t('settings.viewProfile')}
            </Text>
          </View>
        </View>
      </GroupedCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.step14,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.headline,
  },
  link: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
