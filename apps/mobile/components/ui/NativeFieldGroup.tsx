import { Children, createContext, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  FieldGroup,
  Host,
  Icon,
  Row,
  Spacer,
  Text,
  type IconName,
} from '@expo/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/hooks/use-colors';
import { components, spacing, typography } from '@/theme/tokens';

export const NativeFieldGroupContext = createContext(false);

const NATIVE_FIELD_ICONS = {
  chevronRight: Icon.select({
    ios: 'chevron.right',
    android: import('@expo/material-symbols/chevron_right.xml'),
  }),
  globe: Icon.select({
    ios: 'globe',
    android: import('@expo/material-symbols/language.xml'),
  }),
  ruler: Icon.select({
    ios: 'ruler',
    android: import('@expo/material-symbols/straighten.xml'),
  }),
  notifications: Icon.select({
    ios: 'bell.fill',
    android: import('@expo/material-symbols/notifications.xml'),
  }),
  appearance: Icon.select({
    ios: 'moon.fill',
    android: import('@expo/material-symbols/dark_mode.xml'),
  }),
  settings: Icon.select({
    ios: 'gearshape.fill',
    android: import('@expo/material-symbols/settings.xml'),
  }),
  email: Icon.select({
    ios: 'envelope.fill',
    android: import('@expo/material-symbols/alternate_email.xml'),
  }),
  terms: Icon.select({
    ios: 'doc.text',
    android: import('@expo/material-symbols/description.xml'),
  }),
  privacy: Icon.select({
    ios: 'lock.fill',
    android: import('@expo/material-symbols/lock.xml'),
  }),
  about: Icon.select({
    ios: 'info.circle',
    android: import('@expo/material-symbols/info.xml'),
  }),
} satisfies Record<string, IconName>;

export type NativeFieldIconName = Exclude<keyof typeof NATIVE_FIELD_ICONS, 'chevronRight'>;

interface NativeFieldSectionProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  title?: string;
}

interface NativeFieldRowProps {
  disabled?: boolean;
  icon?: NativeFieldIconName;
  iconColor?: string;
  label: string;
  labelColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
  testID?: string;
  value?: string;
}

export function NativeFieldSection({ children, style, testID, title }: NativeFieldSectionProps) {
  const colorScheme = useColorScheme();
  const theme = useColors();
  const estimatedHeight = getFieldSectionHeight(children, title);

  return (
    <NativeFieldGroupContext.Provider value>
      <Host
        colorScheme={colorScheme}
        style={[styles.host, { height: estimatedHeight }, style]}
        testID={testID ? `${testID}-host` : undefined}
        useViewportSizeMeasurement
      >
        <FieldGroup
          testID={testID}
          style={{ backgroundColor: theme.background }}
        >
          <FieldGroup.Section title={title}>{children}</FieldGroup.Section>
        </FieldGroup>
      </Host>
    </NativeFieldGroupContext.Provider>
  );
}

function getFieldSectionHeight(children: ReactNode, title?: string): number {
  const rowCount = Children.toArray(children).filter(Boolean).length;
  const headerHeight = title ? spacing.xl : spacing.md;
  return Math.max(
    components.row.minHeight,
    rowCount * components.row.minHeight + headerHeight + spacing.md,
  );
}

export function NativeFieldRow({
  disabled,
  icon,
  iconColor,
  label,
  labelColor,
  onPress,
  showChevron,
  testID,
  value,
}: NativeFieldRowProps) {
  const theme = useColors();
  const renderChevron = showChevron ?? typeof onPress === 'function';

  return (
    <Row
      alignment="center"
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      spacing={components.row.gap}
      style={styles.row}
      testID={testID}
    >
      {icon ? (
        <Icon
          name={NATIVE_FIELD_ICONS[icon]}
          size={typography.body.fontSize}
          color={iconColor ?? theme.interactive}
        />
      ) : null}
      <Text
        numberOfLines={1}
        textStyle={{
          ...typography.body,
          color: labelColor ?? theme.onSurface,
        }}
      >
        {label}
      </Text>
      <Spacer flexible />
      {value ? (
        <Text
          numberOfLines={1}
          textStyle={{
            ...typography.subheadline,
            color: theme.onSurfaceVariant,
          }}
        >
          {value}
        </Text>
      ) : null}
      {renderChevron ? (
        <Icon
          name={NATIVE_FIELD_ICONS.chevronRight}
          size={typography.body.fontSize}
          color={theme.textDisabled}
        />
      ) : null}
    </Row>
  );
}

const styles = {
  host: {
    width: '100%' as const,
  },
  row: {
    paddingHorizontal: components.row.paddingH,
    paddingVertical: components.row.paddingV,
  },
};
