import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDog } from '@/hooks/use-dog';
import { useUpdateDog, useGeneratePhotoUploadUrl } from '@/hooks/use-dog-mutations';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { DogForm, isDogFormValid, type DogFormValues } from '@/components/dogs/DogForm';
import { PhotoPicker } from '@/components/dogs/PhotoPicker';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { normalizeImageContentType, uploadToPresignedUrl } from '@/lib/upload';
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
      currentPhotoUrl={dog.photoUrl ?? null}
    />
  );
}

interface EditDogContentProps {
  id: string;
  initialValues: DogFormValues;
  currentPhotoUrl: string | null;
}

function EditDogContent({ id, initialValues, currentPhotoUrl }: EditDogContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const { mutateAsync: updateDog } = useUpdateDog();
  const { mutateAsync: generateUploadUrl } = useGeneratePhotoUploadUrl();
  const runWithAlert = useMutationWithAlert();

  const [values, setValues] = useState<DogFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const canSave = isDogFormValid(values) && !submitting;

  // 写真は先に署名付き URL へアップロードし、成功した key だけを犬プロフィールへ保存します。
  async function handlePhotoChange(uri: string, contentType: string) {
    const normalizedContentType = normalizeImageContentType(contentType);
    setPreviewUri(uri);
    setPhotoLoading(true);
    try {
      await runWithAlert(async () => {
        const { url, key } = await generateUploadUrl({
          dogId: id,
          contentType: normalizedContentType,
        });
        await uploadToPresignedUrl(url, uri, normalizedContentType);
        await updateDog({ id, input: { photoUrl: key } });
      }, 'dogs.edit.photoUploadError');
    } finally {
      setPreviewUri(null);
      setPhotoLoading(false);
    }
  }

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
        <PhotoPicker
          currentPhotoUrl={previewUri ?? currentPhotoUrl}
          onPick={handlePhotoChange}
          loading={photoLoading}
        />
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
    minHeight: 44,
  },
  navTitle: { ...typography.headline },
  navAction: { ...typography.body },
  navActionStrong: { ...typography.body, fontWeight: '600' },
  scrollContent: { flexGrow: 1, padding: spacing.lg },
});
