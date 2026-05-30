import { StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/use-colors';
import { components, typography } from '@/theme/tokens';

type OwnerAvatarSize = 'card' | 'profile' | 'editor';
type AvatarStyle = { width: number; height: number; borderRadius: number };

interface OwnerAvatarProps {
  displayName: string | null;
  avatarUrl: string | null;
  size: OwnerAvatarSize;
  testID?: string;
}

export function OwnerAvatar({
  displayName,
  avatarUrl,
  size,
  testID,
}: OwnerAvatarProps) {
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
    width: components.ownerAvatar.cardSize,
    height: components.ownerAvatar.cardSize,
    borderRadius: components.ownerAvatar.cardSize / 2,
  },
  profileAvatar: {
    width: components.ownerAvatar.profileSize,
    height: components.ownerAvatar.profileSize,
    borderRadius: components.ownerAvatar.profileSize / 2,
  },
  editorAvatar: {
    width: components.ownerAvatar.editorSize,
    height: components.ownerAvatar.editorSize,
    borderRadius: components.ownerAvatar.editorSize / 2,
  },
  cardInitial: {
    ...typography.title2,
  },
  largeInitial: {
    ...typography.largeTitle,
  },
});

const AVATAR_STYLE_BY_KIND: Record<OwnerAvatarSize, AvatarStyle> = {
  card: styles.cardAvatar,
  profile: styles.profileAvatar,
  editor: styles.editorAvatar,
};
