import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDog } from '@/hooks/use-dog';
import { useDeleteDog, useUpdateDog } from '@/hooks/use-dog-mutations';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import {
  DogForm,
  birthdayValuesToInput,
  clampGoalMinutes,
  dogBirthdayToFormValues,
  isDogFormValid,
  normalizeGoalCycleDays,
  type DogFormValues,
} from '@/components/dogs/DogForm';
import { DogAvatarEditor } from '@/components/dogs/DogAvatarEditor';
import { DogContactChromeButton } from '@/components/dogs/DogContactChromeButton';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { DAILY_GOAL_CYCLE_DAYS, DEFAULT_DAILY_GOAL_MINUTES } from '@/constants/walk';
import { useColors } from '@/hooks/use-colors';
import { components, dogContactChrome, spacing } from '@/theme/tokens';
import type { UploadFile } from '@/lib/graphql/client';
import { runDetached } from '@/lib/run-detached';

// 犬編集画面 — Contacts 風 chrome でフォームの Cancel/Save を提供します。
// dog データのロード待ちは外側、form state 初期化は内側コンポーネントに分離して
// React Hooks ルールを守りつつ initial values を一発で確定する。
export default function EditDogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: dog, isLoading } = useDog(id, 'ALL');

  if (isLoading || !dog) return <LoadingScreen />;

  return (
    <EditDogContent
      id={id}
      dogName={dog.name}
      initialValues={{
        name: dog.name,
        breed: dog.breed ?? '',
        gender: dog.gender ?? '',
        ...dogBirthdayToFormValues(dog.birthday),
        goalMinutes: clampGoalMinutes(
          dog.walkGoal?.walkAmount.minutes ?? DEFAULT_DAILY_GOAL_MINUTES,
          normalizeGoalCycleDays(dog.walkGoal?.walkAmount.cycleDays),
        ),
        goalCycleDays: normalizeGoalCycleDays(
          dog.walkGoal?.walkAmount.cycleDays ?? DAILY_GOAL_CYCLE_DAYS,
        ),
      }}
      currentAvatar={dog.avatar ?? dog.photoUrl ?? null}
    />
  );
}

interface EditDogContentProps {
  id: string;
  dogName: string;
  initialValues: DogFormValues;
  currentAvatar: string | null;
}

function EditDogContent({ id, dogName, initialValues, currentAvatar }: EditDogContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const { mutateAsync: updateDog } = useUpdateDog();
  const { mutateAsync: deleteDog } = useDeleteDog();
  const runWithAlert = useMutationWithAlert();

  const [values, setValues] = useState<DogFormValues>(initialValues);
  const [avatarFile, setAvatarFile] = useState<UploadFile | null>(null);
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
          walkGoal: {
            minutes: clampGoalMinutes(values.goalMinutes, values.goalCycleDays),
            cycleDays: values.goalCycleDays,
          },
          ...(avatarFile ? { avatarFile } : {}),
        },
      });
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    const ok = await runWithAlert(() => deleteDog(id), 'dogs.detail.deleteError');
    if (ok) {
      router.replace('/(tabs)/dogs');
    }
  }

  function openRemoveConfirm() {
    Alert.alert(
      t('dogs.edit.removeConfirmTitle', { name: dogName }),
      t('dogs.edit.removeConfirmMessage'),
      [
        { text: t('common.action.cancel'), style: 'cancel' },
        {
          text: t('dogs.edit.removeAction'),
          style: 'destructive',
          onPress: () => {
            runDetached(handleRemove(), 'dogs.edit.remove');
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View testID="dog-edit-header" style={styles.header}>
        <DogContactChromeButton
          shape="circle"
          label={t('common.action.cancel')}
          accessibilityLabel={t('common.action.cancel')}
          iconName="xmark"
          onPress={() => router.back()}
          testID="dog-edit-cancel-button"
        />
        <DogContactChromeButton
          shape="circle"
          label={t('common.action.save')}
          accessibilityLabel={t('common.action.save')}
          iconName="checkmark"
          onPress={handleSave}
          disabled={!canSave}
          testID="dog-edit-save-button"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <DogAvatarEditor value={currentAvatar} onChange={setAvatarFile} dogName={dogName} />
        <DogForm values={values} onChange={setValues} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dogs.edit.remove', { name: dogName })}
          onPress={openRemoveConfirm}
          style={[styles.removeButton, { backgroundColor: theme.surface }]}
        >
          <Text style={[styles.removeButtonText, { color: theme.error }]}>
            {t('dogs.edit.remove', { name: dogName })}
          </Text>
        </Pressable>
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
  removeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: dogContactChrome.deleteButtonMinHeight,
    marginTop: spacing.lg,
    borderRadius: dogContactChrome.deleteButtonRadius,
  },
  removeButtonText: {
    ...components.button.fontGhost,
  },
});
