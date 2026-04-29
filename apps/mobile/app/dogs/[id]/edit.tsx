import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDog } from '@/hooks/use-dog';
import { useUpdateDog, useGeneratePhotoUploadUrl } from '@/hooks/use-dog-mutations';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { DogForm, type DogFormValues } from '@/components/dogs/DogForm';
import { PhotoPicker } from '@/components/dogs/PhotoPicker';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { normalizeImageContentType, uploadToPresignedUrl } from '@/lib/upload';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';

// 犬編集画面はプロフィールフォームと写真アップロードを同じ route で扱います。
export default function EditDogScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColors();

  const { data: dog, isLoading } = useDog(id, 'ALL');
  const { mutateAsync: updateDog } = useUpdateDog();
  const { mutateAsync: generateUploadUrl } = useGeneratePhotoUploadUrl();
  const runWithAlert = useMutationWithAlert();
  const [photoLoading, setPhotoLoading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  if (isLoading || !dog) return <LoadingScreen />;

  // 写真は先に署名付き URL へアップロードし、成功した key だけを犬プロフィールへ保存します。
  async function handlePhotoChange(uri: string, contentType: string) {
    const normalizedContentType = normalizeImageContentType(contentType);
    setPreviewUri(uri);
    setPhotoLoading(true);
    try {
      await runWithAlert(async () => {
        const { url, key } = await generateUploadUrl({
          dogId: id,
          contentType: normalizedContentType,
        });
        await uploadToPresignedUrl(url, uri, normalizedContentType);
        await updateDog({ id, input: { photoUrl: key } });
      }, 'dogs.edit.photoUploadError');
    } finally {
      setPreviewUri(null);
      setPhotoLoading(false);
    }
  }

  // 基本情報の更新後は元の詳細画面へ戻り、変更結果は query の再取得に任せます。
  async function handleSubmit(values: DogFormValues) {
    await updateDog({
      id,
      input: {
        name: values.name,
        breed: values.breed || undefined,
        gender: values.gender || undefined,
      },
    });
    router.back();
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <PhotoPicker
        currentPhotoUrl={previewUri ?? dog.photoUrl ?? null}
        onPick={handlePhotoChange}
        loading={photoLoading}
      />
      <DogForm
        onSubmit={handleSubmit}
        submitLabel={t('dogs.edit.submit')}
        initialValues={{
          name: dog.name,
          breed: dog.breed ?? '',
          gender: dog.gender ?? '',
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg },
});
