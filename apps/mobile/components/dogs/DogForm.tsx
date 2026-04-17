import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { spacing } from '@/theme/tokens';

export interface DogFormValues {
  name: string;
  breed: string;
  gender: string;
}

interface DogFormProps {
  onSubmit: (values: DogFormValues) => Promise<void>;
  submitLabel: string;
  initialValues?: Partial<DogFormValues>;
}

export function DogForm({ onSubmit, submitLabel, initialValues }: DogFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [breed, setBreed] = useState(initialValues?.breed ?? '');
  const [gender, setGender] = useState(initialValues?.gender ?? '');
  const [loading, setLoading] = useState(false);

  const isValid = name.trim().length > 0 && gender.trim().length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        breed: breed.trim(),
        gender: gender.trim(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        label={t('dogs.form.name')}
        value={name}
        onChangeText={setName}
        placeholder={t('dogs.form.namePlaceholder')}
      />
      <TextInput
        label={t('dogs.form.breed')}
        value={breed}
        onChangeText={setBreed}
        placeholder={t('dogs.form.breedPlaceholder')}
      />
      <TextInput
        label={t('dogs.form.gender')}
        value={gender}
        onChangeText={setGender}
        placeholder={t('dogs.form.genderPlaceholder')}
      />
      <Button
        label={submitLabel}
        onPress={handleSubmit}
        loading={loading}
        disabled={!isValid}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  button: { marginTop: spacing.sm },
});
