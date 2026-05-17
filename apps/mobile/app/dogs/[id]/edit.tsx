import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDog } from '@/hooks/use-dog';
import { useDeleteDog, useUpdateDog } from '@/hooks/use-dog-mutations';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import {
  DogForm,
  birthdayValuesToInput,
  dogBirthdayToFormValues,
  isDogFormValid,
  type DogFormValues,
} from '@/components/dogs/DogForm';
import { DogAvatarEditor } from '@/components/dogs/DogAvatarEditor';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useColors } from '@/hooks/use-colors';
import { components, spacing } from '@/theme/tokens';
import type { UploadFile } from '@/lib/graphql/client';

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
      dogName={dog.name}
      initialValues={{
        name: dog.name,
        breed: dog.breed ?? '',
        gender: dog.gender ?? '',
        ...dogBirthdayToFormValues(dog.birthday),
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
            void handleRemove();
          },
        },
      ],
    );
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
        <DogAvatarEditor value={currentAvatar} onChange={setAvatarFile} dogName={dogName} />
        <DogForm values={values} onChange={setValues} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dogs.edit.remove', { name: dogName })}
          onPress={openRemoveConfirm}
          style={styles.removeButton}
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
  scrollContent: { flexGrow: 1, padding: spacing.lg },
  removeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: components.row.minHeight,
    marginTop: spacing.lg,
    backgroundColor: 'transparent',
  },
  removeButtonText: {
    ...components.button.fontGhost,
  },
});
