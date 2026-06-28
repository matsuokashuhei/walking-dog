import type { ReactNode } from 'react';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    mergeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    flushGetRequests: jest.fn(),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
    multiMerge: jest.fn(() => Promise.resolve()),
  }),
);

jest.mock('react-native-reanimated', () => {
  const { Animated, Image, Text, View } = require('react-native');

  class AnimationBuilderMock {
    duration = jest.fn(() => {
      return this;
    });
    springify = jest.fn(() => {
      return this;
    });
    damping = jest.fn(() => {
      return this;
    });
    stiffness = jest.fn(() => {
      return this;
    });
  }

  return {
    __esModule: true,
    default: {
      ...Animated,
      Image,
      Text,
      View,
      createAnimatedComponent: (component: unknown) => component,
    },
    FadeIn: new AnimationBuilderMock(),
    FadeOut: new AnimationBuilderMock(),
    LinearTransition: new AnimationBuilderMock(),
  };
});

jest.mock('@expo/ui', () => {
  const React = require('react');
  const {
    Pressable,
    Text: RNText,
    TextInput: RNTextInput,
    View,
  } = require('react-native');

  const Host = ({
    children,
    style,
    testID,
    ...props
  }: {
    children?: ReactNode;
    style?: unknown;
    testID?: string;
    [key: string]: unknown;
  }) => React.createElement(View, { style, testID, ...props }, children);

  const RNHostView = ({
    children,
    style,
    testID,
  }: {
    children?: ReactNode;
    style?: unknown;
    testID?: string;
  }) => React.createElement(View, { style, testID }, children);

  const FieldGroup = ({
    children,
    style,
    testID,
  }: {
    children?: ReactNode;
    style?: unknown;
    testID?: string;
  }) => React.createElement(View, { style, testID }, children);
  FieldGroup.Section = ({ children, title }: { children?: ReactNode; title?: string }) => (
    React.createElement(
      View,
      null,
      title ? React.createElement(RNText, null, title) : null,
      children,
    )
  );

  const Row = ({
    children,
    disabled,
    onPress,
    style,
    testID,
  }: {
    children?: ReactNode;
    disabled?: boolean;
    onPress?: () => void;
    style?: unknown;
    testID?: string;
  }) => React.createElement(Pressable, { disabled, onPress, style, testID }, children);

  const Spacer = () => React.createElement(View, { testID: 'native-spacer' });

  const Text = ({
    children,
    numberOfLines,
    textStyle,
  }: {
    children?: ReactNode;
    numberOfLines?: number;
    textStyle?: unknown;
  }) => React.createElement(RNText, { numberOfLines, style: textStyle }, children);

  const TextInput = ({
    onBlur,
    onChangeText,
    onFocus,
    placeholder,
    placeholderTextColor,
    style,
    testID,
    textStyle,
    value,
    ...props
  }: {
    onBlur?: () => void;
    onChangeText?: (value: string) => void;
    onFocus?: () => void;
    placeholder?: string;
    placeholderTextColor?: string;
    style?: unknown;
    testID?: string;
    textStyle?: unknown;
    value?: { value: string } | string;
    [key: string]: unknown;
  }) => {
    const currentValue = typeof value === 'object' && value !== null ? value.value : value;
    return React.createElement(RNTextInput, {
      onBlur,
      onChangeText: (nextValue: string) => {
          if (typeof value === 'object' && value !== null) {
            value.value = nextValue;
          }
          onChangeText?.(nextValue);
        },
      onFocus,
      placeholder,
      placeholderTextColor,
      ...props,
      style: [style, textStyle],
      testID,
      value: currentValue,
    });
  };

  const Icon = ({ name, testID }: { name?: unknown; testID?: string }) => (
    React.createElement(RNText, { testID }, typeof name === 'string' ? name : 'icon')
  );
  Icon.select = (spec: { ios: unknown }) => spec.ios;

  return {
    FieldGroup,
    Host,
    Icon,
    RNHostView,
    Row,
    Spacer,
    Text,
    TextInput,
    useNativeState: (initialValue: string) => ({ value: initialValue }),
  };
});

// Initialize i18next with English translations so t() returns real strings in tests.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ja from './lib/i18n/locales/ja.json';
import en from './lib/i18n/locales/en.json';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ja: { translation: ja } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    initAsync: false,
  });
}

// Eagerly trigger all lazy globals installed by expo/src/winter/runtime.native.ts
// so their values are cached in the module registry before Jest 30 closes the scope.
const globals = [
  'TextDecoder',
  'TextDecoderStream',
  'TextEncoderStream',
  'URL',
  'URLSearchParams',
  '__ExpoImportMetaRegistry',
  'structuredClone',
] as const;

for (const name of globals) {
  try {
    // Accessing the global triggers the lazy getter, which calls require() and
    // caches the result. Subsequent accesses use the cached value directly.
    void (global as any)[name];
  } catch {
    // Some globals may not be present; ignore errors.
  }
}
