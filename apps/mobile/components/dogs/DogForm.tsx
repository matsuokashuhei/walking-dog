import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
  const [name, setName] = useState(initialValues?.name ?? '');
  const [breed, setBreed] = useState(initialValues?.breed ?? '');
  const [gender, setGender] = useState(initialValues?.gender ?? '');
  const [loading, setLoading] = useState(false);

  const isValid = name.trim().length > 0;

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
        label="名前"
        value={name}
        onChangeText={setName}
        placeholder="例: ポチ"
      />
      <TextInput
        label="犬種"
        value={breed}
        onChangeText={setBreed}
        placeholder="例: 柴犬"
      />
      <TextInput
        label="性別"
        value={gender}
        onChangeText={setGender}
        placeholder="例: オス"
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
