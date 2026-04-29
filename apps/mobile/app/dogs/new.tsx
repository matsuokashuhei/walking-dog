import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCreateDog } from '@/hooks/use-dog-mutations';
import { DogForm, type DogFormValues } from '@/components/dogs/DogForm';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';

// 新規犬登録画面はフォーム送信後、作成した犬の詳細へ遷移します。
export default function NewDogScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const { mutateAsync: createDog } = useCreateDog();

  // フォーム値を API 入力へ整え、作成完了後にモーダルを閉じて詳細画面へ進みます。
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
      contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <DogForm onSubmit={handleSubmit} submitLabel={t('dogs.new.submit')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg },
});
