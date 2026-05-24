<!-- ERNE-GENERATED -->
<!-- erne-profile: standard -->
# mobile — Development Rules

## Expo QR コードの確認方法

- ターミナルでは QR コードが表示されないため、ブラウザで以下の URL を開く:
  ```
  https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=exp%3A%2F%2F192.168.68.66%3A8081
  ```
- `192.168.68.66` はホストマシンの LAN IP。変わった場合は `REACT_NATIVE_PACKAGER_HOSTNAME` も更新する。

---

# ERNE Configuration

## Project Stack
- **Framework**: React Native with Expo (managed)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based)
- **State**: None
- **Styling**: StyleSheet.create
- **Lists**: FlatList (built-in)
- **Images**: expo-image
- **Testing**: None configured
- **Build**: Manual

## Key Rules
- Functional components only with `const` + arrow functions
- Named exports only (no default exports)
- Use Expo Router file-based routing — no manual navigation config
- Use secure storage for tokens — avoid AsyncStorage for sensitive data
- Conventional Commits: feat:, fix:, refactor:, test:, docs:, chore:
- UI 実装は **Expo 公式ライブラリを最優先で検討する**（`expo-router/unstable-native-tabs` の `NativeTabs`、`presentation: 'formSheet'`、`expo-glass-effect`、`@expo/ui`、`expo-blur` など）。カスタム実装・community 製パッケージはネイティブ API が足りないことを確認してから採用する。
- grouped row 形式の設定・フォーム選択 UI は、Me 画面の Units と同じ `ActionSheetIOS` ベースのポップアップ選択を第一候補にする。
- スタイルは **必ず `apps/mobile/theme/tokens.ts` のトークンを使う**。`StyleSheet.create` で `fontSize` / `fontWeight` / `letterSpacing` / `lineHeight` / `padding*` / `margin*` / `borderRadius` / `color` / 影 などを直書きしてはならない。`typography.*` / `spacing.*` / `radius.*` / `colors[scheme].*` / `elevation.*` を spread か参照で利用する。**設計仕様の値が既存トークンに無い場合は、`tokens.ts` に新しいトークンを追加してから使う**（インラインで magic number を書かない）。例外は overlay-on-photo のように意図的にテーマ非依存にしたい色のみで、その場合もファイル内の名前付き定数にしてコメントで根拠を残す。
- Expo SDK 56 以降では `@react-navigation/*` を直接依存・直接 import しない。`ThemeProvider` / `DarkTheme` / `DefaultTheme` など必要な API は `expo-router` から import する。

## Available Commands
/plan, /code-review, /tdd, /build-fix, /perf, /upgrade, /debug, /deploy,
/component, /navigate, /animate, /quality-gate, /code, /feature, /learn, /retrospective, /setup-device

## Rules
@import .claude/rules/common/
@import .claude/rules/expo/

## Skills
@import .claude/skills/
