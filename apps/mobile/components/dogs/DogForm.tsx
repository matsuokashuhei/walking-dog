import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { TextInput } from '@/components/ui/TextInput';

export interface DogFormValues {
  name: string;
  breed: string;
  gender: string;
}

interface DogFormProps {
  values: DogFormValues;
  onChange: (values: DogFormValues) => void;
}

// 02b. Dog edit の inset-grouped 形式: 1 枚のカードに行を積み上げ、hairline で区切る。
// 純粋な controlled component — values と onChange のみ受け取る。Submit / loading は呼び出し元の
// 画面（Cancel/Save header）が担う。
export function DogForm({ values, onChange }: DogFormProps) {
  const { t } = useTranslation();
  const set = (patch: Partial<DogFormValues>) => onChange({ ...values, ...patch });

  return (
    <View style={styles.container}>
      <GroupedCard>
        <TextInput
          label={t('dogs.form.name')}
          labelPosition="inline"
          separator
          value={values.name}
          onChangeText={(name) => set({ name })}
          placeholder={t('dogs.form.namePlaceholder')}
        />
        <TextInput
          label={t('dogs.form.breed')}
          labelPosition="inline"
          separator
          value={values.breed}
          onChangeText={(breed) => set({ breed })}
          placeholder={t('dogs.form.breedPlaceholder')}
        />
        <TextInput
          label={t('dogs.form.gender')}
          labelPosition="inline"
          value={values.gender}
          onChangeText={(gender) => set({ gender })}
          placeholder={t('dogs.form.genderPlaceholder')}
        />
      </GroupedCard>
    </View>
  );
}

export function isDogFormValid(values: DogFormValues): boolean {
  return values.name.trim().length > 0 && values.gender.trim().length > 0;
}

const styles = StyleSheet.create({
  container: { width: '100%' },
});
