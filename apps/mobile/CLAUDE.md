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
- `expo-widgets` / `@expo/ui` の Live Activity UI は native module を module load 時に読むため、通常の hook / store / controller からは静的 import しない。テスト可能な純粋ロジックと controller を分け、controller 側では widget UI module を遅延 require して Jest が `ExpoWidgets` native module を要求しない構造にする。
- `expo-widgets` で Widget extension を追加した後に Xcode の dependency cycle が出た場合は、生成済み `ios/` だけを手で直さず config plugin で再生成後も安定する修正にする。App extension の embed は `[CP] Embed Pods Frameworks` の後、Dev Launcher の Info.plist 変更 script は不要な `Info.plist` input dependency を持たせない。
- `@bacons/apple-targets` を使う場合は `@expo/prebuild-config` を top-level devDependency として Expo SDK のバージョンに合わせて固定する。plugin が実行時に top-level require するため、Expo CLI 配下の nested dependency だけでは `expo prebuild` が失敗する。
- Apple Watch の walk snapshot は Watch UI/complication 表示同期専用に保つ。iPhone JS state が無い状態から snapshot で active walk を復元しない。Watch command は iPhone 側の現在の active walk store と一致する場合だけ処理し、inactive/stale walk の command は ack して破棄する。
- Live Activity と散歩記録をまたぐ修正では、ActivityKit 側だけを更新せず、前景 GPS・背景 GPS・永続化した active walk session・復帰時 navigation が同じ点列と `walkId` を参照する設計にする。Dynamic Island の tap は iOS がアプリ起動に予約しているため、tap URL は履歴詳細ではなく active recording route を指す。
- Pee/poop の表示アイコンは全サーフェスで統一する。React Native 側は `lib/walk/events.ts` の `WALK_EVENT_EMOJIS` を単一ソースにし、pee は `💧`、poop/poo は `💩` を使う。Live Activity と Watch SwiftUI でも同じ emoji を表示し、SF Symbols の `drop.fill` などに分岐させない。`expo-widgets` の Live Activity layout は関数を文字列化して Widget 側 JSContext で再評価するため、layout 関数内では imported constant を参照せず、関数内 local literal と回帰テストで値を固定する。

## iOS Simulator 起動手順

シミュレーターでアプリを起動するときは、必ず下記の順に実行する。

1. `npm run metro:kill`
2. `npm run ios:clean`
3. `npm run ios:sim:local`

## Available Commands
/plan, /code-review, /tdd, /build-fix, /perf, /upgrade, /debug, /deploy,
/component, /navigate, /animate, /quality-gate, /code, /feature, /learn, /retrospective, /setup-device

## Rules
@import .claude/rules/common/
@import .claude/rules/expo/

## Skills
@import .claude/skills/
