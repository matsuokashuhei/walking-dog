import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { TextInput } from '@/components/ui/TextInput';
import { useColors } from '@/hooks/use-colors';
import { spacing, typography } from '@/theme/tokens';
import type { Birthday, BirthdayInput } from '@/types/graphql';

export interface DogFormValues {
  name: string;
  breed: string;
  gender: string;
  // 誕生日は飼い主が知っている範囲だけ入力できる。controlled TextInput に合わせて文字列で保持し、
  // 送信時に数値へ変換する（空欄＝未設定）。
  birthdayYear: string;
  birthdayMonth: string;
  birthdayDay: string;
}

interface DogFormProps {
  values: DogFormValues;
  onChange: (values: DogFormValues) => void;
}

// 数字以外の入力を弾く（IME や貼り付け対策）。
const digitsOnly = (text: string) => text.replace(/[^0-9]/g, '');

// 02b. Dog edit の inset-grouped 形式: 1 枚のカードに行を積み上げ、hairline で区切る。
// 純粋な controlled component — values と onChange のみ受け取る。Submit / loading は呼び出し元の
// 画面（Cancel/Save header）が担う。
export function DogForm({ values, onChange }: DogFormProps) {
  const { t } = useTranslation();
  const theme = useColors();
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

      <Text style={[styles.sectionHeader, { color: theme.onSurfaceVariant }]}>
        {t('dogs.form.birthday')}
      </Text>
      <GroupedCard>
        <TextInput
          label={t('dogs.form.birthdayYear')}
          labelPosition="inline"
          separator
          keyboardType="number-pad"
          maxLength={4}
          value={values.birthdayYear}
          onChangeText={(birthdayYear) => set({ birthdayYear: digitsOnly(birthdayYear) })}
          placeholder={t('dogs.form.birthdayYearPlaceholder')}
        />
        <TextInput
          label={t('dogs.form.birthdayMonth')}
          labelPosition="inline"
          separator
          keyboardType="number-pad"
          maxLength={2}
          value={values.birthdayMonth}
          onChangeText={(birthdayMonth) => set({ birthdayMonth: digitsOnly(birthdayMonth) })}
          placeholder={t('dogs.form.birthdayMonthPlaceholder')}
        />
        <TextInput
          label={t('dogs.form.birthdayDay')}
          labelPosition="inline"
          keyboardType="number-pad"
          maxLength={2}
          value={values.birthdayDay}
          onChangeText={(birthdayDay) => set({ birthdayDay: digitsOnly(birthdayDay) })}
          placeholder={t('dogs.form.birthdayDayPlaceholder')}
        />
      </GroupedCard>
    </View>
  );
}

export function isDogFormValid(values: DogFormValues): boolean {
  return values.name.trim().length > 0 && values.gender.trim().length > 0;
}

// フォームの 3 つの文字列を API 入力（任意の年・月・日）へ変換する。
// すべて空なら undefined（= 誕生日を送らない）。月/日は妥当な範囲のものだけ採用する。
export function birthdayValuesToInput(values: DogFormValues): BirthdayInput | undefined {
  const year = toPositiveInt(values.birthdayYear);
  const month = toPositiveInt(values.birthdayMonth);
  const day = toPositiveInt(values.birthdayDay);

  const input: BirthdayInput = {};
  if (year !== undefined) input.year = year;
  if (month !== undefined && month >= 1 && month <= 12) input.month = month;
  if (day !== undefined && day >= 1 && day <= 31) input.day = day;

  return Object.keys(input).length > 0 ? input : undefined;
}

// 既存の犬の誕生日をフォームの初期値（文字列）へ落とす。編集画面の初期化に使う。
export function dogBirthdayToFormValues(
  birthday: Birthday | null | undefined,
): Pick<DogFormValues, 'birthdayYear' | 'birthdayMonth' | 'birthdayDay'> {
  return {
    birthdayYear: birthday?.year != null ? String(birthday.year) : '',
    birthdayMonth: birthday?.month != null ? String(birthday.month) : '',
    birthdayDay: birthday?.day != null ? String(birthday.day) : '',
  };
}

function toPositiveInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  sectionHeader: {
    ...typography.footnote,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    marginLeft: spacing.md,
  },
});
