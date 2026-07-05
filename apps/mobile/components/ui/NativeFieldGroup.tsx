import { Children, createContext, Fragment, isValidElement, type ReactNode } from 'react';
import {
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Host,
  Icon,
  Row,
  Spacer,
  Text,
  type IconName,
} from '@expo/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/hooks/use-colors';
import { components, elevation, radius, spacing, typography } from '@/theme/tokens';

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
  const theme = useColors();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.section, style]}>
      {title ? (
        <RNText style={[styles.title, { color: theme.onSurfaceVariant }]}>
          {title}
        </RNText>
      ) : null}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface },
          elevation.low,
        ]}
        testID={testID}
      >
        {rows.map((child, index) => (
          <Fragment key={getRowKey(child, index)}>
            {child}
            {index < rows.length - 1 ? (
              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
                testID={testID ? `${testID}-separator-${index}` : undefined}
              />
            ) : null}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function getRowKey(child: ReactNode, index: number): string {
  if (isValidElement(child) && child.key != null) {
    return String(child.key);
  }
  return `row-${index}`;
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
  const colorScheme = useColorScheme();
  const theme = useColors();
  const renderChevron = showChevron ?? typeof onPress === 'function';

  return (
    <Host
      colorScheme={colorScheme}
      matchContents={{ vertical: true }}
      style={styles.rowHost}
      testID={testID ? `${testID}-host` : undefined}
    >
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
    </Host>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%' as const,
  },
  title: {
    ...typography.metricLabel,
    fontWeight: typography.headline.fontWeight,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.step10,
  },
  card: {
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: components.row.paddingH,
  },
  rowHost: {
    width: '100%',
  },
  row: {
    minHeight: components.row.minHeight,
    paddingHorizontal: components.row.paddingH,
    paddingVertical: components.row.paddingV,
  },
});
