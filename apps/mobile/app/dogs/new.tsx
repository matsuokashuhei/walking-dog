import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateDog } from '@/hooks/use-dog-mutations';
import { DogForm, type DogFormValues } from '@/components/dogs/DogForm';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';

export default function NewDogScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { mutateAsync: createDog } = useCreateDog();

  async function handleSubmit(values: DogFormValues) {
    const dog = await createDog({
      name: values.name,
      breed: values.breed || undefined,
      gender: values.gender || undefined,
    });
    router.replace(`/dogs/${dog.id}`);
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText type="title" style={styles.title}>新しい犬を登録</ThemedText>
      <DogForm onSubmit={handleSubmit} submitLabel="登録" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg },
  title: { marginBottom: spacing.xl },
});
