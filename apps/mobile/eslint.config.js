// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const i18next = require('eslint-plugin-i18next');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression[typeAnnotation.type="TSNeverKeyword"]',
          message:
            '`as never` キャストは型エラーを握りつぶすため禁止。router.push/replace には typed routes の生成型 (Href) を使う。',
        },
        {
          selector:
            "Property[key.name=/^(NSLocationWhenInUseUsageDescription|locationWhenInUsePermission|locationAlwaysAndWhenInUsePermission|photosPermission|cameraPermission)$/][value.type='Literal']",
          message:
            'Native 権限文言は直接書かず、ローカライズ可能な設定リソースから参照してください。',
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
    plugins: {
      i18next,
    },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          message:
            'ユーザーに表示または読み上げられる文字列は lib/i18n/locales の翻訳キーへ移してください',
          'jsx-components': {
            exclude: ['Trans', 'IconSymbol'],
          },
          'jsx-attributes': {
            include: [
              'accessibilityHint',
              'accessibilityLabel',
              'cancelLabel',
              'confirmLabel',
              'label',
              'placeholder',
              'text',
              'title',
            ],
          },
          words: {
            exclude: [
              '[0-9!-/:-@[-`{-~]+',
              '[A-Z_-]+',
              'Walking Dog',
              'LIVE',
              'km',
              'mi',
              'ft',
              /^[^\p{L}\p{N}]+$/u,
              /^\p{Emoji}+$/u,
            ],
          },
          callees: {
            exclude: [
              'i18n(ext)?',
              't',
              'require',
              'addEventListener',
              'removeEventListener',
              'postMessage',
              'getElementById',
              'dispatch',
              'commit',
              'includes',
              'indexOf',
              'endsWith',
              'startsWith',
              'renderActionSlot',
              'slotTestID',
            ],
          },
          'should-validate-template': true,
        },
      ],
    },
  },
  {
    files: ['app.config.ts'],
    rules: {
      'i18next/no-literal-string': 'off',
    },
  },
]);
