import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { radius, spacing, typography } from '@/theme/tokens';
import { GroupedCard } from '@/components/ui/GroupedCard';

interface ProfileCardProps {
  displayName: string | null;
}

export function ProfileCard({ displayName }: ProfileCardProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const initial = displayName?.trim()?.[0]?.toUpperCase() ?? '?';
  const email = t('settings.emailPlaceholder');

  return (
    <GroupedCard padding="md" elevated={false} style={styles.card}>
      <View style={styles.row}>
        <LinearGradient
          colors={[theme.success, theme.interactive]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={[styles.avatarInitial, { color: theme.onInteractive }]}>{initial}</Text>
        </LinearGradient>
        <View style={styles.textBlock}>
          <Text style={[styles.name, { color: theme.onSurface }]} numberOfLines={1}>
            {displayName ?? '-'}
          </Text>
          <Text
            style={[styles.email, { color: theme.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {email}
          </Text>
          <Text style={[styles.link, { color: theme.interactive }]}>
            {t('settings.viewProfile')}
          </Text>
        </View>
      </View>
    </GroupedCard>
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
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...typography.title2,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.headline,
  },
  email: {
    ...typography.footnote,
    marginTop: spacing.xs / 2,
  },
  link: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
