import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  useCreateDog,
  useGeneratePhotoUploadUrl,
  useUpdateDog,
} from '@/hooks/use-dog-mutations';
import { useMutationWithAlert } from '@/hooks/use-mutation-with-alert';
import { DogForm, isDogFormValid, type DogFormValues } from '@/components/dogs/DogForm';
import { PhotoPicker } from '@/components/dogs/PhotoPicker';
import { useColors } from '@/hooks/use-colors';
import { normalizeImageContentType, uploadToPresignedUrl } from '@/lib/upload';
import { spacing, typography } from '@/theme/tokens';

// 新規犬登録画面 — 02b. Dog edit に合わせた Cancel/Save の自前 nav bar を持つ。
// 写真は dog ID が未確定のため 2-stage flow: ローカル URI 保持 → createDog 後にアップロード。
export default function NewDogScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();
  const { mutateAsync: createDog } = useCreateDog();
  const { mutateAsync: updateDog } = useUpdateDog();
  const { mutateAsync: generateUploadUrl } = useGeneratePhotoUploadUrl();
  const runWithAlert = useMutationWithAlert();

  const [values, setValues] = useState<DogFormValues>({ name: '', breed: '', gender: '' });
  const [submitting, setSubmitting] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<{ uri: string; contentType: string } | null>(
    null,
  );

  const canSave = isDogFormValid(values) && !submitting;

  // Stage 1: 写真選択時はローカル URI のみ保持。S3 アップロードは createDog 後に行う。
  async function handlePhotoSelected(uri: string, contentType: string) {
    setPendingPhoto({ uri, contentType: normalizeImageContentType(contentType) });
  }

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      const dog = await createDog({
        name: values.name.trim(),
        breed: values.breed.trim() || undefined,
        gender: values.gender.trim() || undefined,
      });

      // Stage 2: ユーザーが写真を選択していれば、登録した犬に紐付ける。
      // 失敗しても dog は既に作成済みなので、エラー通知のうえ詳細画面へ遷移する。
      if (pendingPhoto) {
        await runWithAlert(async () => {
          const { url, key } = await generateUploadUrl({
            dogId: dog.id,
            contentType: pendingPhoto.contentType,
          });
          await uploadToPresignedUrl(url, pendingPhoto.uri, pendingPhoto.contentType);
          await updateDog({ id: dog.id, input: { photoUrl: key } });
        }, 'dogs.new.photoUploadError');
      }

      router.dismiss();
      router.push(`/dogs/${dog.id}`);
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
        <Text style={[styles.navTitle, { color: theme.onSurface }]}>{t('dogs.new.title')}</Text>
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
        <PhotoPicker currentPhotoUrl={pendingPhoto?.uri ?? null} onPick={handlePhotoSelected} />
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
