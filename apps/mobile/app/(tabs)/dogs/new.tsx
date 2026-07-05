import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCreateDog } from '@/hooks/use-dog-mutations';
import {
  DogForm,
  birthdayValuesToInput,
  isDogFormValid,
  type DogFormValues,
} from '@/components/dogs/DogForm';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DAILY_GOAL_CYCLE_DAYS, DEFAULT_DAILY_GOAL_MINUTES } from '@/constants/walk';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';

// 新規犬登録画面 — inline ScreenHeader でフォームの Cancel/Save を提供します。
export default function NewDogScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const { mutateAsync: createDog } = useCreateDog();

  const [values, setValues] = useState<DogFormValues>({
    name: '',
    breed: '',
    gender: '',
    birthdayYear: '',
    birthdayMonth: '',
    birthdayDay: '',
    goalMinutes: DEFAULT_DAILY_GOAL_MINUTES,
    goalCycleDays: DAILY_GOAL_CYCLE_DAYS,
  });
  const [submitting, setSubmitting] = useState(false);

  const canSave = isDogFormValid(values) && !submitting;

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      const dog = await createDog({
        name: values.name.trim(),
        breed: values.breed.trim() || undefined,
        gender: values.gender.trim() || undefined,
        birthday: birthdayValuesToInput(values),
      });

      router.dismiss();
      router.push(`/(tabs)/dogs/${dog.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScreenHeader
        variant="inline"
        title={t('dogs.new.title')}
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
        <DogForm values={values} onChange={setValues} showDailyGoal={false} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: spacing.lg },
});
