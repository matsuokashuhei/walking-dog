import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { radius, spacing } from '@/theme/tokens';
import { GroupedCard } from '@/components/ui/GroupedCard';

interface ProfileCardProps {
  displayName: string | null;
}

const AVATAR_GRADIENT = ['#bf5af2', '#0a84ff'] as const;

export function ProfileCard({ displayName }: ProfileCardProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const initial = displayName?.trim()?.[0]?.toUpperCase() ?? '?';
  const email = t('settings.emailPlaceholder');

  return (
    <GroupedCard padding="md" elevated={false} style={styles.card}>
      <View style={styles.row}>
        <LinearGradient
          colors={AVATAR_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarInitial}>{initial}</Text>
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
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 24,
  },
  email: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  link: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
});
