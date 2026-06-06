import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from './UserAvatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { normalizeImageContentType } from '@/lib/upload';
import { useColors } from '@/hooks/use-colors';
import { components, spacing, typography } from '@/theme/tokens';
import type { UploadFile } from '@/lib/graphql/client';

interface UserAvatarEditorProps {
  value: string | null;
  displayName: string | null;
  onChange: (file: UploadFile | null) => void;
}

export function UserAvatarEditor({
  value,
  displayName,
  onChange,
}: UserAvatarEditorProps) {
  const { t } = useTranslation();
  const theme = useColors();
  const [selectedFile, setSelectedFile] = useState<UploadFile | null>(null);
  const previewUri = selectedFile?.uri ?? value;

  async function handleChangePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t('userEdit.photoPermissionDenied'),
        t('userEdit.photoPermissionMessage'),
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
        accessibilityLabel={t('userEdit.changePhoto')}
        onPress={handleChangePhoto}
        hitSlop={spacing.sm}
        style={styles.pressable}
      >
        <View style={styles.avatarWrap}>
          <UserAvatar
            displayName={displayName}
            avatarUrl={previewUri}
            size="editor"
            testID="user-avatar-editor-avatar"
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
          {t('userEdit.changePhoto')}
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
    width: components.userAvatar.cameraBadgeSize,
    height: components.userAvatar.cameraBadgeSize,
    borderRadius: components.userAvatar.cameraBadgeSize / 2,
    borderWidth: components.userAvatar.cameraBadgeBorderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: {
    ...typography.footnote,
    fontWeight: typography.headline.fontWeight,
    marginTop: spacing.step10,
  },
});
