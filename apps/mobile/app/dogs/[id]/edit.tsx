import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useDog } from '@/hooks/use-dog';
import { useUpdateDog, useGeneratePhotoUploadUrl } from '@/hooks/use-dog-mutations';
import { dogKeys } from '@/lib/graphql/keys';
import { DogForm, type DogFormValues } from '@/components/dogs/DogForm';
import { PhotoPicker } from '@/components/dogs/PhotoPicker';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ThemedText } from '@/components/themed-text';
import { uploadToPresignedUrl } from '@/lib/upload';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';

export default function EditDogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { data: dog, isLoading } = useDog(id, 'ALL');
  const { mutateAsync: updateDog } = useUpdateDog();
  const { mutateAsync: generateUploadUrl } = useGeneratePhotoUploadUrl();
  const queryClient = useQueryClient();
  const [photoLoading, setPhotoLoading] = useState(false);

  if (isLoading || !dog) return <LoadingScreen />;

  async function handlePhotoChange(uri: string, contentType: string) {
    setPhotoLoading(true);
    try {
      const { url } = await generateUploadUrl(id);
      await uploadToPresignedUrl(url, uri, contentType);
      // Invalidate dog cache so the updated photoUrl is fetched from the server
      queryClient.invalidateQueries({ queryKey: dogKeys.all });
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
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText type="title" style={styles.title}>犬のプロフィールを編集</ThemedText>
      <PhotoPicker
        currentPhotoUrl={dog.photoUrl}
        onPick={handlePhotoChange}
        loading={photoLoading}
      />
      <DogForm
        onSubmit={handleSubmit}
        submitLabel="更新"
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
  title: { marginBottom: spacing.lg },
});
