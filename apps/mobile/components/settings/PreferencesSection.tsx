import { ActionSheetIOS, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeFieldRow, NativeFieldSection } from '@/components/ui/NativeFieldGroup';
import { useColors } from '@/hooks/use-colors';
import { spacing } from '@/theme/tokens';
import { useSettingsStore } from '@/stores/settings-store';

const LANGUAGES = [
  { label: '日本語', value: 'ja' },
  { label: 'English', value: 'en' },
] as const;

const THEMES = ['light', 'dark', 'auto'] as const;
type ThemeOption = (typeof THEMES)[number];

const UNITS = ['km', 'mile'] as const;
type UnitOption = (typeof UNITS)[number];

export function PreferencesSection() {
  const { t } = useTranslation();
  const theme = useColors();
  const themeMode = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);
  const units = useSettingsStore((s) => s.units);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setUnits = useSettingsStore((s) => s.setUnits);

  const languageLabel =
    LANGUAGES.find((l) => l.value === language)?.label ?? language;

  const themeLabels: Record<ThemeOption, string> = {
    light: t('settings.themeLight'),
    dark: t('settings.themeDark'),
    auto: t('settings.themeAuto'),
  };

  const unitsLabels: Record<UnitOption, string> = {
    km: t('settings.unitsKm'),
    mile: t('settings.unitsMile'),
  };

  function presentSheet<T extends string>(
    options: readonly T[],
    labels: Record<T, string>,
    current: T,
    apply: (next: T) => unknown,
  ) {
    const cancelLabel = t('settings.cancel');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options.map((o) => labels[o]), cancelLabel],
          cancelButtonIndex: options.length,
        },
        (index) => {
          if (index < options.length) apply(options[index]);
        },
      );
    } else {
      const i = options.indexOf(current);
      const next = options[(i + 1) % options.length];
      apply(next);
    }
  }

  return (
    <View style={styles.wrapper}>
      <NativeFieldSection title={t('settings.sectionLabel.preferences')}>
        <NativeFieldRow
          icon="globe"
          iconColor={theme.interactive}
          label={t('settings.language')}
          value={languageLabel}
          onPress={() =>
            presentSheet(
              LANGUAGES.map((l) => l.value),
              Object.fromEntries(LANGUAGES.map((l) => [l.value, l.label])) as Record<
                string,
                string
              >,
              language,
              setLanguage,
            )
          }
        />
        <NativeFieldRow
          icon="ruler"
          iconColor={theme.interactive}
          label={t('settings.units')}
          value={unitsLabels[units]}
          onPress={() => presentSheet(UNITS, unitsLabels, units, setUnits)}
        />
        <NativeFieldRow
          icon="notifications"
          iconColor={theme.warning}
          label={t('settings.notifications')}
          value={t('settings.notificationsValue')}
          showChevron
        />
        <NativeFieldRow
          icon="appearance"
          iconColor={theme.warning}
          label={t('settings.appearance')}
          value={themeLabels[themeMode]}
          onPress={() => presentSheet(THEMES, themeLabels, themeMode, setTheme)}
        />
      </NativeFieldSection>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
});
