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
- Expo Router 配下で画面内 inline header を描画するルート群は、各 leaf route ではなく親 `_layout.tsx` の `Stack` に `screenOptions={{ headerShown: false }}` を設定し、ネイティブヘッダーの出し漏れを防ぐ。
- `expo-widgets` / `@expo/ui` の Live Activity UI は native module を module load 時に読むため、通常の hook / store / controller からは静的 import しない。テスト可能な純粋ロジックと controller を分け、controller 側では widget UI module を遅延 require して Jest が `ExpoWidgets` native module を要求しない構造にする。
- `expo-widgets` で Widget extension を追加した後に Xcode の dependency cycle が出た場合は、生成済み `ios/` だけを手で直さず config plugin で再生成後も安定する修正にする。App extension の embed は `[CP] Embed Pods Frameworks` の後、Dev Launcher の Info.plist 変更 script は不要な `Info.plist` input dependency を持たせない。
- `@bacons/apple-targets` を使う場合は `@expo/prebuild-config` を top-level devDependency として Expo SDK のバージョンに合わせて固定する。plugin が実行時に top-level require するため、Expo CLI 配下の nested dependency だけでは `expo prebuild` が失敗する。`Failed to resolve plugin for module "@bacons/apple-targets"` が出たら、まず `npm ls @bacons/apple-targets @expo/prebuild-config --depth=0` で top-level install を確認し、欠けていれば `npm ci` で lockfile どおり再インストールする。
- Watch target を含む実機 `expo run:ios --device` は、全 target に `DEVELOPMENT_TEAM` が入っていると Expo CLI が `-allowProvisioningUpdates` を省略する。初回 profile 作成が必要なため、物理デバイス向け npm script は `scripts/expo-run-ios-with-provisioning.cjs` 経由で Expo CLI を起動し、`xcodebuild` spawn 時だけ provisioning flags を足す。
- `npm run ios:dev:dev` が成功しても Expo の install 経路は iPhone app のインストール確認だけで終わることがある。Watch 実機に入らない場合は `npm run watch:dev` を使う。この script は online の Apple Watch UDID を `xcrun xctrace list devices` から検出し、`WalkingDogWatch` scheme を watchOS destination 向けに build してから `xcrun devicectl device install app` で直接インストールする。確認は `xcrun devicectl device info apps --device "<watch id>" --bundle-id com.walkingdog.app.watch` で行う。
- Apple Watch の walk snapshot は Watch UI/complication 表示同期専用に保つ。iPhone JS state が無い状態から snapshot で active walk を復元しない。Watch command は iPhone 側の現在の active walk store と一致する場合だけ処理し、inactive/stale walk の command は ack して破棄する。
- Live Activity と散歩記録をまたぐ修正では、ActivityKit 側だけを更新せず、前景 GPS・背景 GPS・永続化した active walk session・復帰時 navigation が同じ点列と `walkId` を参照する設計にする。Dynamic Island の tap は iOS がアプリ起動に予約しているため、tap URL は履歴詳細ではなく active recording route を指す。
- Walk 開始・記録中などマップ主役の画面は、route 側で `ScreenHeader` / top-only `SafeAreaView` を挟まず、マップを全画面に敷いた上で `WalkMapShell` の overlay と NativeTabs/formSheet を重ねる。
- Walk 開始前の preview マップは foreground の現在地 region へ寄せる。東京駅などの固定座標は GPS 現在地取得前に地図を描画するための初期領域に限定し、ready 画面の主表示として扱わない。
- 記録中マップの現在地表示は `useWalkStore().points` の最新点を単一の source of truth にする。犬プロフィール画像などの表示情報は route 側で選択犬を解決して `WalkMap` に渡し、`showsUserLocation` など別系統の現在地表示と併用しない。
- Pee/poop の表示アイコンは全サーフェスで統一する。React Native 側は `lib/walk/events.ts` の `WALK_EVENT_EMOJIS` を単一ソースにし、pee は `💧`、poop/poo は `💩` を使う。Live Activity と Watch SwiftUI でも同じ emoji を表示し、SF Symbols の `drop.fill` などに分岐させない。`expo-widgets` の Live Activity layout は関数を文字列化して Widget 側 JSContext で再評価するため、layout 関数内では imported constant を参照せず、関数内 local literal と回帰テストで値を固定する。
- Dog 詳細画面は閲覧と編集導線に集中させ、Delete ボタンや削除確認などの破壊的操作を置かない。犬の削除操作は編集画面の remove フローに集約する。

## iOS Simulator 起動手順

シミュレーターでアプリを起動するときは、必ず下記の順に実行する。

1. `npm run metro:kill`
2. `npm run ios:clean`
3. `npm run ios:sim:local`

XcodeBuildMCP で同名の Simulator が複数ある環境を操作するときは、`simulatorName` ではなく `simulatorId` を指定する。名前解決だけだと停止中の別 OS ランタイムを選ぶことがある。

## Available Commands
/plan, /code-review, /tdd, /build-fix, /perf, /upgrade, /debug, /deploy,
/component, /navigate, /animate, /quality-gate, /code, /feature, /learn, /retrospective, /setup-device

## Rules
@import .claude/rules/common/
@import .claude/rules/expo/

## Skills
@import .claude/skills/
