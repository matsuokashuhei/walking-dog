import { useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GroupedCard } from '@/components/ui/GroupedCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TextInput } from '@/components/ui/TextInput';
import { useColors } from '@/hooks/use-colors';
import { components, radius, spacing, typography } from '@/theme/tokens';
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

const BIRTHDAY_YEAR_START = 1990;
const MONTH_COUNT = 12;
const DEFAULT_DAY_COUNT = 31;
const MONTH_SAMPLE_YEAR = 2020;
const MONTH_SAMPLE_DAY = 1;
const DOG_GENDER_VALUES = ['MALE', 'FEMALE', 'OTHER'] as const;
type DogGenderValue = (typeof DOG_GENDER_VALUES)[number];

// 02b. Dog edit の inset-grouped 形式: 1 枚のカードに行を積み上げ、hairline で区切る。
// 純粋な controlled component — values と onChange のみ受け取る。Submit / loading は呼び出し元の
// 画面（Cancel/Save header）が担う。
export function DogForm({ values, onChange }: DogFormProps) {
  const { t, i18n } = useTranslation();
  const theme = useColors();
  const [birthdayPickerVisible, setBirthdayPickerVisible] = useState(false);
  const [birthdayDraft, setBirthdayDraft] = useState<
    Pick<DogFormValues, 'birthdayYear' | 'birthdayMonth' | 'birthdayDay'>
  >({ birthdayYear: '', birthdayMonth: '', birthdayDay: '' });
  const set = (patch: Partial<DogFormValues>) => onChange({ ...values, ...patch });
  const birthdayDisplay = formatBirthdayDisplay(values, i18n.language, t);
  const birthdayDraftDisplay = formatBirthdayDisplay(
    { ...values, ...birthdayDraft },
    i18n.language,
    t,
  );
  const genderValue = normalizeGenderValue(values.gender);
  const genderOptions = [
    { value: 'MALE', label: t('dogs.form.genderMale') },
    { value: 'FEMALE', label: t('dogs.form.genderFemale') },
    { value: 'OTHER', label: t('dogs.form.genderOther') },
  ] as const;
  const genderLabel =
    genderOptions.find((option) => option.value === genderValue)?.label ??
    t('dogs.form.genderSelect');
  const selectedYear = toPositiveInt(birthdayDraft.birthdayYear);
  const selectedMonth = toBoundedInt(birthdayDraft.birthdayMonth, MONTH_COUNT);
  const selectedDay = toBoundedInt(birthdayDraft.birthdayDay, DEFAULT_DAY_COUNT);
  const maxDay = getMaxDay(selectedYear, selectedMonth);
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from(
      { length: currentYear - BIRTHDAY_YEAR_START + 1 },
      (_, index) => String(currentYear - index),
    );
  }, []);
  const months = useMemo(
    () => Array.from({ length: MONTH_COUNT }, (_, index) => String(index + 1)),
    [],
  );
  const days = useMemo(
    () => Array.from({ length: maxDay }, (_, index) => String(index + 1)),
    [maxDay],
  );

  function selectYear(year: string) {
    if (year === '') {
      setBirthdayDraft({ birthdayYear: '', birthdayMonth: '', birthdayDay: '' });
      return;
    }
    setBirthdayDraft((current) => ({ ...current, birthdayYear: year }));
  }

  function selectMonth(month: string) {
    if (month === '') {
      setBirthdayDraft((current) => ({ ...current, birthdayMonth: '', birthdayDay: '' }));
      return;
    }
    const nextMaxDay = getMaxDay(selectedYear, Number(month));
    const birthdayDay =
      selectedDay && selectedDay <= nextMaxDay ? birthdayDraft.birthdayDay : '';
    setBirthdayDraft((current) => ({ ...current, birthdayMonth: month, birthdayDay }));
  }

  function openBirthdayPicker() {
    setBirthdayDraft({
      birthdayYear: values.birthdayYear,
      birthdayMonth: values.birthdayMonth,
      birthdayDay: values.birthdayDay,
    });
    setBirthdayPickerVisible(true);
  }

  function cancelBirthdayPicker() {
    setBirthdayPickerVisible(false);
  }

  function saveBirthdayPicker() {
    set({
      birthdayYear: birthdayDraft.birthdayYear,
      birthdayMonth: birthdayDraft.birthdayMonth,
      birthdayDay: birthdayDraft.birthdayDay,
    });
    setBirthdayPickerVisible(false);
  }

  function presentGenderSheet() {
    const apply = (index: number) => {
      const option = genderOptions[index];
      if (option) set({ gender: option.value });
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...genderOptions.map((option) => option.label), t('common.action.cancel')],
          cancelButtonIndex: genderOptions.length,
        },
        apply,
      );
      return;
    }

    const currentIndex = genderOptions.findIndex((option) => option.value === genderValue);
    apply((currentIndex + 1) % genderOptions.length);
  }

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
        <View style={styles.inlineRow}>
          <Text style={[styles.inlineLabel, { color: theme.onSurfaceVariant }]}>
            {t('dogs.form.gender')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dogs.form.gender')}
            onPress={presentGenderSheet}
            style={styles.genderValueWrap}
          >
            <Text
              style={[
                styles.genderValue,
                { color: genderValue ? theme.onSurface : theme.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              {genderLabel}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dogs.form.birthday')}
          onPress={openBirthdayPicker}
          style={styles.inlineRow}
        >
          <Text style={[styles.inlineLabel, { color: theme.onSurfaceVariant }]}>
            {t('dogs.form.birthday')}
          </Text>
          {birthdayDisplay.isPlaceholder ? null : (
            <Text
              style={[
                styles.birthdayValue,
                { color: theme.onSurface },
              ]}
              numberOfLines={1}
            >
              {birthdayDisplay.text}
            </Text>
          )}
        </Pressable>
      </GroupedCard>
      <Modal
        animationType="fade"
        transparent
        visible={birthdayPickerVisible}
        onRequestClose={() => setBirthdayPickerVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.action.cancel')}
                onPress={cancelBirthdayPicker}
                style={[styles.modalIconButton, { backgroundColor: theme.surfaceContainer }]}
              >
                <IconSymbol
                  name="xmark"
                  size={typography.headline.fontSize}
                  color={theme.onSurfaceVariant}
                />
              </Pressable>
              <View accessibilityRole="header" style={styles.modalHeaderSpacer} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.action.save')}
                onPress={saveBirthdayPicker}
                style={[styles.modalIconButton, { backgroundColor: theme.success }]}
              >
                <IconSymbol
                  name="checkmark"
                  size={typography.headline.fontSize}
                  color={theme.onInteractive}
                />
              </Pressable>
            </View>
            {birthdayDraftDisplay.isPlaceholder ? null : (
              <Text style={[styles.modalSummary, { color: theme.onSurface }]}>
                {birthdayDraftDisplay.text}
              </Text>
            )}
            <View style={styles.pickerColumns}>
              <BirthdayPickerColumn
                title={t('dogs.form.birthdayYear')}
                unknownLabel={t('dogs.form.birthdayUnknown')}
                values={years}
                selectedValue={birthdayDraft.birthdayYear}
                formatValue={(year) => year}
                onSelect={selectYear}
                testIDPrefix="birthday-year"
              />
              <BirthdayPickerColumn
                title={t('dogs.form.birthdayMonth')}
                unknownLabel={t('dogs.form.birthdayUnknown')}
                values={months}
                selectedValue={birthdayDraft.birthdayMonth}
                formatValue={(month) => formatMonthName(Number(month), i18n.language)}
                onSelect={selectMonth}
                disabled={!selectedYear}
                testIDPrefix="birthday-month"
              />
              <BirthdayPickerColumn
                title={t('dogs.form.birthdayDay')}
                unknownLabel={t('dogs.form.birthdayUnknown')}
                values={days}
                selectedValue={birthdayDraft.birthdayDay}
                formatValue={(day) => day}
                onSelect={(birthdayDay) =>
                  setBirthdayDraft((current) => ({ ...current, birthdayDay }))
                }
                disabled={!selectedMonth}
                testIDPrefix="birthday-day"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface BirthdayPickerColumnProps {
  title: string;
  unknownLabel: string;
  values: string[];
  selectedValue: string;
  formatValue: (value: string) => string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  testIDPrefix: string;
}

function BirthdayPickerColumn({
  title,
  unknownLabel,
  values,
  selectedValue,
  formatValue,
  onSelect,
  disabled = false,
  testIDPrefix,
}: BirthdayPickerColumnProps) {
  const theme = useColors();

  return (
    <View style={styles.pickerColumn}>
      <Text style={[styles.pickerColumnTitle, { color: theme.onSurfaceVariant }]}>
        {title}
      </Text>
      <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
        <BirthdayPickerOption
          label={unknownLabel}
          selected={selectedValue === ''}
          disabled={disabled}
          onPress={() => onSelect('')}
          testID={`${testIDPrefix}-unknown`}
        />
        {values.map((value) => (
          <BirthdayPickerOption
            key={value}
            label={formatValue(value)}
            selected={selectedValue === value}
            disabled={disabled}
            onPress={() => onSelect(value)}
            testID={`${testIDPrefix}-${value}`}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface BirthdayPickerOptionProps {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}

function BirthdayPickerOption({
  label,
  selected,
  disabled,
  onPress,
  testID,
}: BirthdayPickerOptionProps) {
  const theme = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[
        styles.pickerOption,
        selected ? { backgroundColor: theme.surfaceContainer } : null,
      ]}
    >
      <Text
        style={[
          styles.pickerOptionText,
          { color: disabled ? theme.textDisabled : theme.onSurface },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function isDogFormValid(values: DogFormValues): boolean {
  return values.name.trim().length > 0 && values.gender.trim().length > 0;
}

// フォームの 3 つの文字列を API 入力（任意の年・月・日）へ変換する。
// 妥当な値が一つも無ければ null を返す（編集画面では誕生日のクリア、新規画面では未設定として扱われる）。
// 月/日は妥当な範囲のものだけ採用する。
export function birthdayValuesToInput(values: DogFormValues): BirthdayInput | null {
  const year = toPositiveInt(values.birthdayYear);
  const month = year ? toPositiveInt(values.birthdayMonth) : undefined;
  const day = year && month ? toPositiveInt(values.birthdayDay) : undefined;

  const input: BirthdayInput = {};
  if (year !== undefined) input.year = year;
  if (month !== undefined && month >= 1 && month <= 12) input.month = month;
  if (day !== undefined && day >= 1 && day <= 31) input.day = day;

  return Object.keys(input).length > 0 ? input : null;
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

function toBoundedInt(value: string, max: number): number | undefined {
  const parsed = toPositiveInt(value);
  return parsed !== undefined && parsed <= max ? parsed : undefined;
}

function formatBirthdayDisplay(
  values: DogFormValues,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): { text: string; isPlaceholder: boolean } {
  const year = toPositiveInt(values.birthdayYear);
  const month = toBoundedInt(values.birthdayMonth, MONTH_COUNT);
  const day = toBoundedInt(values.birthdayDay, DEFAULT_DAY_COUNT);

  if (!year) {
    return { text: t('dogs.form.birthdayPlaceholder'), isPlaceholder: true };
  }
  if (!month) {
    return {
      text: t('dogs.form.birthdayYearOnly', { year }),
      isPlaceholder: false,
    };
  }

  const date = new Date(year, month - 1, day ?? MONTH_SAMPLE_DAY);
  const options: Intl.DateTimeFormatOptions = day
    ? { year: 'numeric', month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'short' };
  return {
    text: new Intl.DateTimeFormat(locale, options).format(date),
    isPlaceholder: false,
  };
}

function formatMonthName(month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(
    new Date(MONTH_SAMPLE_YEAR, month - 1, MONTH_SAMPLE_DAY),
  );
}

function getMaxDay(year: number | undefined, month: number | undefined): number {
  if (!year || !month) return DEFAULT_DAY_COUNT;
  return new Date(year, month, 0).getDate();
}

function normalizeGenderValue(gender: string): DogGenderValue | '' {
  const normalized = gender.trim().toUpperCase();
  return DOG_GENDER_VALUES.includes(normalized as DogGenderValue)
    ? (normalized as DogGenderValue)
    : '';
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: components.row.gap,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.step14,
    minHeight: components.row.minHeight,
  },
  inlineLabel: {
    ...typography.subheadline,
    width: components.textInput.inlineLabelWidth,
  },
  birthdayValue: {
    ...typography.body,
    flex: 1,
  },
  genderValueWrap: {
    flex: 1,
    minHeight: components.row.minHeight,
    justifyContent: 'center',
  },
  genderValue: {
    ...typography.body,
    textAlign: 'left',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalHeaderSpacer: {
    flex: 1,
  },
  modalIconButton: {
    width: spacing.step44,
    height: spacing.step44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSummary: {
    ...typography.headline,
    textAlign: 'center',
  },
  pickerColumns: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickerColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  pickerColumnTitle: {
    ...typography.footnote,
    textAlign: 'center',
  },
  pickerScroll: {
    maxHeight: components.birthdayPicker.columnMaxHeight,
  },
  pickerOption: {
    minHeight: components.row.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  pickerOptionText: {
    ...typography.subheadline,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
  },
});
