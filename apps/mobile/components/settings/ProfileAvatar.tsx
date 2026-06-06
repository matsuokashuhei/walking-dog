import { StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/use-colors';
import { components, typography } from '@/theme/tokens';

type ProfileAvatarSize = 'card' | 'profile' | 'editor';
type AvatarStyle = { width: number; height: number; borderRadius: number };

interface ProfileAvatarProps {
  displayName: string | null;
  avatarUrl: string | null;
  size: ProfileAvatarSize;
  testID?: string;
}

export function ProfileAvatar({
  displayName,
  avatarUrl,
  size,
  testID,
}: ProfileAvatarProps) {
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
    width: components.profileAvatar.cardSize,
    height: components.profileAvatar.cardSize,
    borderRadius: components.profileAvatar.cardSize / 2,
  },
  profileAvatar: {
    width: components.profileAvatar.profileSize,
    height: components.profileAvatar.profileSize,
    borderRadius: components.profileAvatar.profileSize / 2,
  },
  editorAvatar: {
    width: components.profileAvatar.editorSize,
    height: components.profileAvatar.editorSize,
    borderRadius: components.profileAvatar.editorSize / 2,
  },
  cardInitial: {
    ...typography.title2,
  },
  largeInitial: {
    ...typography.largeTitle,
  },
});

const AVATAR_STYLE_BY_KIND: Record<ProfileAvatarSize, AvatarStyle> = {
  card: styles.cardAvatar,
  profile: styles.profileAvatar,
  editor: styles.editorAvatar,
};
