import { ActionSheetIOS, Platform, StyleSheet, Text, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/use-colors';
import { spacing, radius, typography } from '@/theme/tokens';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSettingsStore } from '@/stores/settings-store';

const LANGUAGES = [
  { label: '日本語', value: 'ja' },
  { label: 'English', value: 'en' },
];

export function AppearanceSection() {
  const { t } = useTranslation();
  const theme = useColors();
  const themeMode = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const themeOptions = [
    { label: t('settings.themeLight'), value: 'light' },
    { label: t('settings.themeDark'), value: 'dark' },
    { label: t('settings.themeAuto'), value: 'auto' },
  ];

  const currentLanguageLabel =
    LANGUAGES.find((l) => l.value === language)?.label ?? language;

  function handleLanguagePress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...LANGUAGES.map((l) => l.label), t('settings.cancel')],
          cancelButtonIndex: LANGUAGES.length,
        },
        (index) => {
          if (index < LANGUAGES.length) {
            setLanguage(LANGUAGES[index].value);
          }
        },
      );
    } else {
      const currentIndex = LANGUAGES.findIndex((l) => l.value === language);
      const nextIndex = (currentIndex + 1) % LANGUAGES.length;
      setLanguage(LANGUAGES[nextIndex].value);
    }
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceContainerLowest,
          borderColor: theme.border + '33',
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.onSurfaceVariant }]}>
        {t('settings.appearance').toUpperCase()}
      </Text>

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: theme.onSurface }]}>
          {t('settings.theme')}
        </Text>
        <View style={styles.segmentWrapper}>
          <SegmentedControl
            options={themeOptions}
            selected={themeMode}
            onChange={(v) => setTheme(v as 'light' | 'dark' | 'auto')}
          />
        </View>
      </View>

      <View style={[styles.row, { marginTop: spacing.md }]}>
        <Text style={[styles.rowLabel, { color: theme.onSurface }]}>
          {t('settings.language')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('settings.language')}: ${currentLanguageLabel}`}
          onPress={handleLanguagePress}
          style={[styles.dropdown, { borderColor: theme.border + '33' }]}
        >
          <Text style={[styles.dropdownText, { color: theme.onSurface }]}>
            {currentLanguageLabel}
          </Text>
          <Text style={[styles.dropdownArrow, { color: theme.onSurfaceVariant }]}>&#9660;</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    ...typography.body,
    marginRight: spacing.md,
    flexShrink: 0,
  },
  segmentWrapper: {
    flex: 1,
    flexShrink: 1,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  dropdownText: {
    fontSize: 14,
  },
  dropdownArrow: {
    fontSize: 12,
  },
});
