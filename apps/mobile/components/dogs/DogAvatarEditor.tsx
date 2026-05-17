import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { normalizeImageContentType } from '@/lib/upload';
import { components, spacing, typography } from '@/theme/tokens';
import type { UploadFile } from '@/lib/graphql/client';

interface DogAvatarEditorProps {
  value: string | null;
  onChange: (file: UploadFile | null) => void;
  dogName?: string;
}

export function DogAvatarEditor({ value, onChange, dogName }: DogAvatarEditorProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const [selectedFile, setSelectedFile] = useState<UploadFile | null>(null);
  const previewUri = selectedFile?.uri ?? value;

  async function handleChangePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t('dogs.form.photoPermissionDenied'),
        t('dogs.form.photoPermissionMessage'),
      );
      return;
    }

    const aspect: [number, number] = [...components.dogAvatarEditor.pickerAspect];
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: components.dogAvatarEditor.pickerQuality,
      allowsEditing: true,
      aspect,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const file = {
      uri: asset.uri,
      name: asset.fileName ?? 'avatar.jpg',
      type: normalizeImageContentType(asset.mimeType),
    };
    setSelectedFile(file);
    onChange(file);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.avatar, { backgroundColor: theme.surfaceContainer }]}>
        {previewUri ? (
          <Image
            testID="dog-avatar-editor-image"
            source={{ uri: previewUri }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityLabel={dogName}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text style={styles.placeholder} accessibilityLabel={dogName}>
            🐩
          </Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dogs.form.changePhoto')}
        onPress={handleChangePhoto}
        hitSlop={spacing.sm}
      >
        <Text style={[styles.changePhoto, { color: theme.interactive }]}>
          {t('dogs.form.changePhoto')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: components.dogAvatarEditor.size,
    height: components.dogAvatarEditor.size,
    borderRadius: components.dogAvatarEditor.radius,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    fontSize: components.dogAvatarEditor.placeholderFontSize,
  },
  changePhoto: {
    ...typography.subheadline,
  },
});
