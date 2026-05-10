import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';

// 新規犬登録画面 — 02b. Dog edit に合わせた Cancel/Save の自前 nav bar を持つ。
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
