import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDog } from '@/hooks/use-dog';
import { useUpdateDog } from '@/hooks/use-dog-mutations';
import {
  DogForm,
  birthdayValuesToInput,
  dogBirthdayToFormValues,
  isDogFormValid,
  type DogFormValues,
} from '@/components/dogs/DogForm';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';

// 犬編集画面 — inline ScreenHeader でフォームの Cancel/Save を提供します。
// dog データのロード待ちは外側、form state 初期化は内側コンポーネントに分離して
// React Hooks ルールを守りつつ initial values を一発で確定する。
export default function EditDogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: dog, isLoading } = useDog(id, 'ALL');

  if (isLoading || !dog) return <LoadingScreen />;

  return (
    <EditDogContent
      id={id}
      initialValues={{
        name: dog.name,
        breed: dog.breed ?? '',
        gender: dog.gender ?? '',
        ...dogBirthdayToFormValues(dog.birthday),
      }}
    />
  );
}

interface EditDogContentProps {
  id: string;
  initialValues: DogFormValues;
}

function EditDogContent({ id, initialValues }: EditDogContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const { mutateAsync: updateDog } = useUpdateDog();

  const [values, setValues] = useState<DogFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);

  const canSave = isDogFormValid(values) && !submitting;

  // 基本情報の更新後は元の詳細画面へ戻り、変更結果は query の再取得に任せます。
  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      await updateDog({
        id,
        input: {
          name: values.name.trim(),
          breed: values.breed.trim() || undefined,
          gender: values.gender.trim() || undefined,
          birthday: birthdayValuesToInput(values),
        },
      });
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        variant="inline"
        title={t('dogs.edit.title')}
        leftAction={{ label: t('common.action.cancel'), onPress: () => router.back() }}
        rightAction={{
          label: t('common.action.save'),
          onPress: handleSave,
          strong: true,
          disabled: !canSave,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <DogForm values={values} onChange={setValues} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: spacing.lg },
});
