import { useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import {
  Host,
  TextInput as ExpoTextInput,
  useNativeState,
  type TextInputProps as ExpoTextInputProps,
} from '@expo/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/hooks/use-colors';
import { components, radius, spacing, typography } from '@/theme/tokens';
import { NativeFieldGroupContext } from './NativeFieldGroup';

type LabelPosition = 'top' | 'inline';
type ExpoFontWeight = NonNullable<ExpoTextInputProps['textStyle']>['fontWeight'];

const EXPO_FONT_WEIGHTS = new Set<ExpoFontWeight>([
  'normal',
  'bold',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
]);

interface TextInputProps
  extends Omit<
    ExpoTextInputProps,
    'onBlur' | 'onFocus' | 'placeholder' | 'style' | 'textStyle' | 'value'
  > {
  label: string;
  error?: string;
  labelPosition?: LabelPosition;
  placeholder?: string;
  /** Native FieldGroup owns row separators; kept only for call-site compatibility. */
  separator?: boolean;
  style?: StyleProp<TextStyle>;
  textStyle?: ExpoTextInputProps['textStyle'];
  value?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export const TextInput = ({
  label,
  error,
  labelPosition = 'top',
  placeholder,
  separator: _separator = false,
  testID,
  onBlur,
  onFocus,
  onChangeText,
  style,
  textStyle,
  value = '',
  ...props
}: TextInputProps) => {
  const theme = useColors();
  const colorScheme = useColorScheme();
  const inNativeFieldGroup = useContext(NativeFieldGroupContext);
  const [isFocused, setIsFocused] = useState(false);
  const [nativeSeed, setNativeSeed] = useState({ value, version: 0 });
  const lastInputValueRef = useRef(value);
  const resolvedPlaceholder = placeholder ?? label;

  useEffect(() => {
    if (value !== lastInputValueRef.current) {
      lastInputValueRef.current = value;
      setNativeSeed((current) =>
        current.value === value
          ? current
          : { value, version: current.version + 1 },
      );
    }
  }, [value]);

  function handleChangeText(nextValue: string) {
    lastInputValueRef.current = nextValue;
    onChangeText?.(nextValue);
  }

  function handleFocus() {
    setIsFocused(true);
    onFocus?.();
  }

  function handleBlur() {
    setIsFocused(false);
    onBlur?.();
  }

  const input = (
    <NativeExpoTextInput
      key={nativeSeed.version}
      initialValue={nativeSeed.value}
      onChangeText={handleChangeText}
      placeholder={resolvedPlaceholder}
      placeholderTextColor={theme.onSurfaceVariant}
      onFocus={handleFocus}
      onBlur={handleBlur}
      testID={testID}
      style={{
        ...nativeInputBoxStyle({ error, isFocused, labelPosition, theme }),
      }}
      textStyle={{
        ...typography.body,
        color: theme.onSurface,
        ...(textStyle ?? {}),
        ...flattenTextStyle(style),
      }}
      {...props}
    />
  );

  if (inNativeFieldGroup && !error) {
    return input;
  }

  return (
    <>
      <Host
        colorScheme={colorScheme}
        matchContents={{ vertical: true }}
        style={styles.host}
        testID={testID ? `${testID}-container` : undefined}
      >
        {input}
      </Host>
      {error ? (
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      ) : null}
    </>
  );
};

function NativeExpoTextInput({
  initialValue,
  ...props
}: Omit<ExpoTextInputProps, 'value'> & { initialValue: string }) {
  const nativeValue = useNativeState(initialValue);
  return <ExpoTextInput value={nativeValue} {...props} />;
}

function nativeInputBoxStyle({
  error,
  isFocused,
  labelPosition,
  theme,
}: {
  error?: string;
  isFocused: boolean;
  labelPosition: LabelPosition;
  theme: ReturnType<typeof useColors>;
}): ExpoTextInputProps['style'] {
  if (labelPosition === 'inline') {
    return {
      width: '100%',
      height: components.row.minHeight,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.step14,
      backgroundColor: isFocused ? theme.surfaceContainer : 'transparent',
      borderWidth: components.textInput.borderWidth,
      borderColor: isFocused ? theme.interactive : 'transparent',
      borderRadius: radius.lg,
    };
  }

  return {
    width: '100%',
    height: components.textInput.height,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.surface,
    borderWidth: components.textInput.borderWidth,
    borderColor: inputBorderColor({ error, isFocused, theme }),
    borderRadius: radius.lg,
  };
}

function inputBorderColor({
  error,
  isFocused,
  theme,
}: {
  error?: string;
  isFocused: boolean;
  theme: ReturnType<typeof useColors>;
}) {
  if (error) {
    return theme.error;
  }
  return isFocused ? theme.interactive : theme.border;
}

function flattenTextStyle(style: StyleProp<TextStyle>): ExpoTextInputProps['textStyle'] {
  const flat = StyleSheet.flatten(style);
  if (!flat) return {};
  return {
    color: typeof flat.color === 'string' ? flat.color : undefined,
    fontFamily: flat.fontFamily,
    fontSize: flat.fontSize,
    fontWeight: toExpoFontWeight(flat.fontWeight),
    letterSpacing: flat.letterSpacing,
    lineHeight: flat.lineHeight,
    textAlign:
      flat.textAlign === 'left' || flat.textAlign === 'right' || flat.textAlign === 'center'
        ? flat.textAlign
        : undefined,
  };
}

function toExpoFontWeight(fontWeight: TextStyle['fontWeight']): ExpoFontWeight | undefined {
  return typeof fontWeight === 'string' && EXPO_FONT_WEIGHTS.has(fontWeight as ExpoFontWeight)
    ? (fontWeight as ExpoFontWeight)
    : undefined;
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
  },
  error: {
    ...typography.caption,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});
