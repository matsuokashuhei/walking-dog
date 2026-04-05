import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';

interface PhotoPickerProps {
  currentPhotoUrl: string | null;
  onPick: (uri: string, contentType: string) => Promise<void>;
  loading?: boolean;
}

export function PhotoPicker({ currentPhotoUrl, onPick, loading = false }: PhotoPickerProps) {
  const { t } = useTranslation();
  const theme = useColors();

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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('dogs.photo.change')}
      onPress={handlePress}
      disabled={loading}
      style={[styles.container, { borderColor: theme.border }]}
    >
      {currentPhotoUrl ? (
        <Image
          source={currentPhotoUrl}
          style={styles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <Text style={[styles.placeholder, { color: theme.onSurfaceVariant }]}>
          {t('dogs.photo.add')}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...typography.caption,
    textAlign: 'center',
  },
});
