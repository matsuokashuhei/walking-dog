import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDog } from '@/hooks/use-dog';
import { useUpdateDog, useGeneratePhotoUploadUrl } from '@/hooks/use-dog-mutations';
import { DogForm, type DogFormValues } from '@/components/dogs/DogForm';
import { PhotoPicker } from '@/components/dogs/PhotoPicker';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { uploadToPresignedUrl } from '@/lib/upload';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';

export default function EditDogScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColors();

  const { data: dog, isLoading } = useDog(id, 'ALL');
  const { mutateAsync: updateDog } = useUpdateDog();
  const { mutateAsync: generateUploadUrl } = useGeneratePhotoUploadUrl();
  const [photoLoading, setPhotoLoading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  if (isLoading || !dog) return <LoadingScreen />;

  async function handlePhotoChange(uri: string, contentType: string) {
    setPreviewUri(uri);
    setPhotoLoading(true);
    try {
      const { url, key } = await generateUploadUrl({ dogId: id, contentType });
      await uploadToPresignedUrl(url, uri, contentType);
      await updateDog({ id, input: { photoUrl: key } });
      setPreviewUri(null);
    } catch {
      setPreviewUri(null);
      Alert.alert(t('common.error'), t('dogs.edit.photoUploadError'));
    } finally {
      setPhotoLoading(false);
    }
  }

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
