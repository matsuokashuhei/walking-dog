import { StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/use-colors';
import { components, typography } from '@/theme/tokens';

type UserAvatarSize = 'card' | 'display' | 'editor';
type AvatarStyle = { width: number; height: number; borderRadius: number };

interface UserAvatarProps {
  displayName: string | null;
  avatarUrl: string | null;
  size: UserAvatarSize;
  testID?: string;
}

export function UserAvatar({
  displayName,
  avatarUrl,
  size,
  testID,
}: UserAvatarProps) {
  const theme = useColors();
  const initial = displayName?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  const avatarStyle = AVATAR_STYLE_BY_KIND[size];

  if (avatarUrl) {
    return (
      <Image
        testID={testID ? `${testID}-image` : undefined}
        source={{ uri: avatarUrl }}
        style={avatarStyle}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={avatarUrl}
        accessibilityLabel={displayName ?? undefined}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <LinearGradient
      testID={testID}
      colors={[theme.success, theme.interactive]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.fallback,
        avatarStyle,
      ]}
    >
      <Text
        style={[
          size === 'card' ? styles.cardInitial : styles.largeInitial,
          { color: theme.onInteractive },
        ]}
      >
        {initial}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatar: {
    width: components.userAvatar.cardSize,
    height: components.userAvatar.cardSize,
    borderRadius: components.userAvatar.cardSize / 2,
  },
  displayAvatar: {
    width: components.userAvatar.displaySize,
    height: components.userAvatar.displaySize,
    borderRadius: components.userAvatar.displaySize / 2,
  },
  editorAvatar: {
    width: components.userAvatar.editorSize,
    height: components.userAvatar.editorSize,
    borderRadius: components.userAvatar.editorSize / 2,
  },
  cardInitial: {
    ...typography.title2,
  },
  largeInitial: {
    ...typography.largeTitle,
  },
});

const AVATAR_STYLE_BY_KIND: Record<UserAvatarSize, AvatarStyle> = {
  card: styles.cardAvatar,
  display: styles.displayAvatar,
  editor: styles.editorAvatar,
};
