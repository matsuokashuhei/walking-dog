import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { cameraBadge } from '@/theme/overrides';

const BADGE_ICON_SIZE = cameraBadge.size / 2;

interface PhotoPickerProps {
  currentPhotoUrl: string | null;
  onPick: (uri: string, contentType: string) => Promise<void>;
  loading?: boolean;
}

export function PhotoPicker({ currentPhotoUrl, onPick, loading = false }: PhotoPickerProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const ctaLabel = currentPhotoUrl ? t('dogs.photo.change') : t('dogs.photo.add');

  async function handlePress() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const contentType = asset.mimeType ?? 'image/jpeg';
    await onPick(asset.uri, contentType);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.photoFrame}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          onPress={handlePress}
          disabled={loading}
          style={[styles.circle, { borderColor: theme.border }]}
        >
          {currentPhotoUrl ? (
            <Image
              source={currentPhotoUrl}
              style={styles.photo}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : null}
        </Pressable>
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.interactive, borderColor: theme.surface },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="camera" size={BADGE_ICON_SIZE} color={theme.onInteractive} />
        </View>
      </View>
      <Text style={[styles.cta, { color: theme.interactive }]}>{ctaLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  // photoFrame は relative 容器。circle 側だけが overflow:'hidden' で写真をクロップし、
  // badge はその外側に絶対配置するため clip されない。
  photoFrame: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  circle: {
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: cameraBadge.size,
    height: cameraBadge.size,
    borderRadius: cameraBadge.radius,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  cta: {
    ...typography.subheadline,
    marginTop: spacing.sm,
  },
});
