// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

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
      ],
    },
  },
]);
