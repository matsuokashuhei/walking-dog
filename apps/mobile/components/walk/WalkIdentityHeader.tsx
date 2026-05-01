import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Tag } from '@/components/ui/Tag';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface WalkIdentityHeaderProps {
  dogs: Dog[];
  title: string;
  subtitle: string;
}

const AVATAR = 32;

// 記録中パネルのヘッダーとして、散歩中の犬と LIVE 状態を簡潔に示します。
export function WalkIdentityHeader({ dogs, title, subtitle }: WalkIdentityHeaderProps) {
  const theme = useColors();

  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <View style={styles.avatars}>
          {dogs.slice(0, 2).map((dog, index) => (
            <Image
              key={dog.id}
              source={dog.photoUrl ?? require('@/assets/images/icon.png')}
              style={[
                styles.avatar,
                { borderColor: theme.surface },
                index > 0 && styles.avatarOverlap,
              ]}
              contentFit="cover"
            />
          ))}
        </View>
        <View style={styles.titleColumn}>
          <Text style={[styles.title, { color: theme.onSurface }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
      <Tag label="LIVE" tone="live" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.body,
    fontWeight: typography.headline.fontWeight,
  },
  subtitle: {
    ...typography.caption,
    marginTop: StyleSheet.hairlineWidth,
  },
});
