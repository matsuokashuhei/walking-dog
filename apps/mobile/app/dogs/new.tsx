import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCreateDog } from '@/hooks/use-dog-mutations';
import {
  DogForm,
  birthdayValuesToInput,
  clampGoalMinutes,
  isDogFormValid,
  type DogFormValues,
} from '@/components/dogs/DogForm';
import { DogAvatarEditor } from '@/components/dogs/DogAvatarEditor';
import { DogContactChromeButton } from '@/components/dogs/DogContactChromeButton';
import { DAILY_GOAL_CYCLE_DAYS, DEFAULT_DAILY_GOAL_MINUTES } from '@/constants/walk';
import { useColors } from '@/hooks/use-colors';
import { dogContactChrome, spacing } from '@/theme/tokens';
import type { UploadFile } from '@/lib/graphql/client';

// 新規犬登録画面 — 編集画面と同じ Contacts 風 chrome で Cancel/Save を提供します。
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
  const [avatarFile, setAvatarFile] = useState<UploadFile | null>(null);
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
        walkGoal: {
          minutes: clampGoalMinutes(values.goalMinutes, values.goalCycleDays),
          cycleDays: values.goalCycleDays,
        },
        ...(avatarFile ? { avatarFile } : {}),
      });

      router.dismiss();
      router.push(`/dogs/${dog.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View testID="dog-new-header" style={styles.header}>
        <DogContactChromeButton
          shape="circle"
          label={t('common.action.cancel')}
          accessibilityLabel={t('common.action.cancel')}
          iconName="xmark"
          onPress={() => router.back()}
          testID="dog-new-cancel-button"
        />
        <DogContactChromeButton
          shape="circle"
          label={t('common.action.save')}
          accessibilityLabel={t('common.action.save')}
          iconName="checkmark"
          onPress={handleSave}
          disabled={!canSave}
          testID="dog-new-save-button"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <DogAvatarEditor
          value={null}
          onChange={setAvatarFile}
          dogName={values.name.trim() || undefined}
        />
        <DogForm values={values} onChange={setValues} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    height: dogContactChrome.circleSize,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scrollContent: { flexGrow: 1, padding: spacing.lg },
});
