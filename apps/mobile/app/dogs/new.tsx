import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCreateDog } from '@/hooks/use-dog-mutations';
import { DogForm, type DogFormValues } from '@/components/dogs/DogForm';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';

export default function NewDogScreen() {
  const { t } = useTranslation();
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
    router.dismiss();
    router.push(`/dogs/${dog.id}`);
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <DogForm onSubmit={handleSubmit} submitLabel={t('dogs.new.submit')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg },
});
