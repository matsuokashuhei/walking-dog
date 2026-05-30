import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { OwnerAvatar } from './OwnerAvatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { normalizeImageContentType } from '@/lib/upload';
import { useColors } from '@/hooks/use-colors';
import { components, spacing, typography } from '@/theme/tokens';
import type { UploadFile } from '@/lib/graphql/client';

interface OwnerAvatarEditorProps {
  value: string | null;
  displayName: string | null;
  onChange: (file: UploadFile | null) => void;
}

export function OwnerAvatarEditor({
  value,
  displayName,
  onChange,
}: OwnerAvatarEditorProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const [selectedFile, setSelectedFile] = useState<UploadFile | null>(null);
  const previewUri = selectedFile?.uri ?? value;

  async function handleChangePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t('settings.profileEdit.photoPermissionDenied'),
        t('settings.profileEdit.photoPermissionMessage'),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: components.dogAvatarEditor.pickerQuality,
      allowsEditing: true,
      aspect: [...components.dogAvatarEditor.pickerAspect],
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.profileEdit.changePhoto')}
        onPress={handleChangePhoto}
        hitSlop={spacing.sm}
        style={styles.pressable}
      >
        <View style={styles.avatarWrap}>
          <OwnerAvatar
            displayName={displayName}
            avatarUrl={previewUri}
            size="editor"
            testID="owner-avatar-editor-avatar"
          />
          <View
            style={[
              styles.cameraBadge,
              {
                backgroundColor: theme.interactive,
                borderColor: theme.background,
              },
            ]}
          >
            <IconSymbol
              name="camera.fill"
              size={typography.footnote.fontSize}
              color={theme.onInteractive}
            />
          </View>
        </View>
        <Text style={[styles.changePhoto, { color: theme.interactive }]}>
          {t('settings.profileEdit.changePhoto')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pressable: {
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    right: -spacing.xs / 2,
    bottom: -spacing.xs / 2,
    width: components.ownerAvatar.cameraBadgeSize,
    height: components.ownerAvatar.cameraBadgeSize,
    borderRadius: components.ownerAvatar.cameraBadgeSize / 2,
    borderWidth: components.ownerAvatar.cameraBadgeBorderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: {
    ...typography.footnote,
    fontWeight: typography.headline.fontWeight,
    marginTop: spacing.step10,
  },
});
