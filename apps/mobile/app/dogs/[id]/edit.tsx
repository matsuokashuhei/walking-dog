import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDog } from '@/hooks/use-dog';
import { useUpdateDog } from '@/hooks/use-dog-mutations';
import { DogForm, isDogFormValid, type DogFormValues } from '@/components/dogs/DogForm';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

// 犬編集画面 — 02b. Dog edit に合わせた Cancel/Save の自前 nav bar を持つ。
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
        },
      });
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.navBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('dogs.action.cancel')}
        >
          <Text style={[styles.navAction, { color: theme.interactive }]}>
            {t('dogs.action.cancel')}
          </Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.onSurface }]}>{t('dogs.edit.title')}</Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('dogs.action.save')}
          accessibilityState={{ disabled: !canSave }}
        >
          <Text
            style={[
              styles.navActionStrong,
              { color: canSave ? theme.interactive : theme.textDisabled },
            ]}
          >
            {t('dogs.action.save')}
          </Text>
        </Pressable>
      </View>
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.step12,
    minHeight: spacing.step44,
  },
  navTitle: { ...typography.headline },
  navAction: { ...typography.body },
  navActionStrong: { ...typography.body, fontWeight: typography.headline.fontWeight },
  scrollContent: { flexGrow: 1, padding: spacing.lg },
});
