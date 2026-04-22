# Tab 3 (Me 画面) を設計書通りに再構成

## Context

ユーザー指示（逐語）: 「@docs/design/walking-dog/README.md Tab 3 - Me 画面を設計書にとおりのUIに変更してください。」

設計書の正解は `docs/design/walking-dog/project/screens/precise-app.jsx:481-533` の `OwnerScreen`。
現状 `apps/mobile/app/(tabs)/settings.tsx` と乖離:

| 項目 | 現状 | 設計書 |
| --- | --- | --- |
| Profile | Display Name + Edit（インライン編集） | グラデーションアバター + 氏名 + email + `View profile` |
| Preferences | Theme segmented + Language dropdown | `Language / Units / Notifications / Appearance` の drill-down 行 |
| Encounter Detection | トグル | **なし（削除）** |
| Legal | なし | `Terms of Service / Privacy Policy / About` 行 |
| Sign out | destructive Button | GroupedCard に 1 行、赤字センタリング |
| Version | 画面下テキスト | `About` 行の value に統合 |

ユーザー選択（AskUserQuestion）:
- Encounter Detection: 削除
- Language / Appearance: ActionSheet で切替（画面遷移なし）
- Units / Notifications / email / View profile: 静的表示、Terms/Privacy だけ外部リンク
- Sign out: 赤字センタリング行

## Files

### 新規
- `apps/mobile/components/settings/ProfileCard.tsx` + `.test.tsx`
- `apps/mobile/components/settings/PreferencesSection.tsx` + `.test.tsx`
- `apps/mobile/components/settings/LegalSection.tsx` + `.test.tsx`
- `apps/mobile/components/settings/SignOutRow.tsx` + `.test.tsx`

### 更新
- `apps/mobile/app/(tabs)/settings.tsx` — 新コンポーネントで差替、version テキスト削除
- `apps/mobile/components/ui/GroupedRow.tsx` — `showChevron?: boolean` 追加（非 pressable でも chevron を描画）
- `apps/mobile/components/ui/GroupedRow.test.tsx` — 新ケース追加
- `apps/mobile/lib/i18n/locales/en.json` / `ja.json` — 新キー追加、未使用キー削除

### 削除
- `apps/mobile/components/settings/EncounterDetectionSection.tsx`
- `apps/mobile/components/settings/AppearanceSection.tsx`
- `apps/mobile/components/settings/ProfileSection.tsx`
- `apps/mobile/components/settings/LogoutButton.tsx`
- `apps/mobile/components/settings/SettingsSection.tsx`
- `apps/mobile/components/settings/SettingsSection.test.tsx`

## Implementation

### 1. `GroupedRow` 拡張
`apps/mobile/components/ui/GroupedRow.tsx` に `showChevron?: boolean`。デフォルトは `isPressable`。既存呼び出しは無影響。

### 2. `ProfileCard.tsx`（TDD）
- props: `displayName: string | null`
- `expo-linear-gradient` で 60×60 サークル `#bf5af2 → #0a84ff` + initial (先頭1文字、なければ `?`)
- 氏名 17pt 600 / email 13pt onSurfaceVariant（固定 `mio@walk.app`） / `View profile` 12pt `theme.interactive`
- ラッパーは `GroupedCard padding="lg"` 相当、下マージン 24
- 未導入なら `expo-linear-gradient` を `package.json` 経由で追加（`npx expo install expo-linear-gradient`）

### 3. `PreferencesSection.tsx`
- `SectionHeader label="PREFERENCES"` + `GroupedCard padding="none"` に 4 `GroupedRow`
- 行 (leading: 絵文字 Text を 16pt で描画):
  - 🌐 Language — value = 現言語ラベル、onPress = 既存 ActionSheetIOS 経由で `setLanguage`（`AppearanceSection.tsx:31-49` のロジックを移植）
  - 📏 Units — value `km, min`、静的、`showChevron`
  - 🔔 Notifications — value `On`、静的、`showChevron`
  - 🌙 Appearance — value 現テーマラベル、onPress = ActionSheetIOS → `setTheme`
- 最終行は `separator={false}`

### 4. `LegalSection.tsx`
- ヘッダー `LEGAL`、行:
  - 📄 Terms of Service — `Linking.openURL('https://walk.app/terms')`
  - 🔒 Privacy Policy — `Linking.openURL('https://walk.app/privacy')`
  - ℹ︎ About — value `Constants.expoConfig?.version ?? '1.0.0'`、静的、`showChevron`

### 5. `SignOutRow.tsx`
- `GroupedCard padding="none"` + 1 `Pressable`、中央寄せ 17pt 500、色 `theme.error`
- `ConfirmDialog` + `useAuth().signOut`（`LogoutButton.tsx` の挙動を移植）

### 6. `settings.tsx` 再構成
```
<Text largeTitle>Me</Text>
<ProfileCard displayName={me.displayName} />
<PreferencesSection />
<LegalSection />
<SignOutRow />
```
version / appEnv / apiUrl の追加テキストブロックは削除（About 行に包含）。

### 7. i18n キー追加（en / ja）
```
settings.sectionLabel.preferences  = PREFERENCES / 環境設定
settings.sectionLabel.legal        = LEGAL / 法的情報
settings.units                     = Units / 単位
settings.unitsValue                = km, min / km、分
settings.notifications             = Notifications / 通知
settings.notificationsValue        = On / オン
settings.viewProfile               = View profile / プロフィールを見る
settings.emailPlaceholder          = mio@walk.app
settings.terms                     = Terms of Service / 利用規約
settings.privacy                   = Privacy Policy / プライバシーポリシー
settings.about                     = About / このアプリについて
```
既存流用: `settings.title`, `settings.language`, `settings.appearance`, `settings.themeLight/Dark/Auto`, `settings.signOut`, `settings.signOutConfirm`, `settings.cancel`, `settings.loadError`。
削除: `settings.profile`, `settings.displayName`, `settings.edit`, `settings.save`, `settings.updateError`, `settings.sectionLabel`, `settings.version`。

### 8. テスト
- `ProfileCard.test.tsx` — 氏名・emailPlaceholder・initial レンダリング
- `PreferencesSection.test.tsx` — 4 ラベル、Language/Appearance タップで `ActionSheetIOS.showActionSheetWithOptions` がモック呼び出し
- `LegalSection.test.tsx` — 3 ラベル、Terms/Privacy タップで `Linking.openURL` 呼び出し
- `SignOutRow.test.tsx` — タップ → Confirm → `signOut` 呼び出し
- `GroupedRow.test.tsx` — `showChevron` 単独で `›` が描画

### 9. 後処理
未使用化した `hooks/use-profile-mutation`、`UPDATE_ENCOUNTER_DETECTION_MUTATION` の参照を grep し、他で未使用なら削除。落ちるテストがあれば該当 i18n / mutation 依存を解消。

## Reusable

- `components/ui/GroupedCard.tsx`、`GroupedRow.tsx`、`SectionHeader.tsx`、`ConfirmDialog.tsx`
- `hooks/use-auth.ts` / `signOut`、`hooks/use-me.ts`、`hooks/use-colors.ts`
- `stores/settings-store.ts` の `setTheme` / `setLanguage`

## Risks

- `expo-linear-gradient` 未導入の可能性。未導入なら追加インストール。
- email は `User` スキーマ未提供のため固定値。API 追加は別タスク。
- Terms/Privacy URL 未定。定数化して後差替可能に。
- `GroupedRow.showChevron` は新規 optional なので既存呼び出しに無影響。

## Verification

1. `docker compose exec mobile npm test -- --watch=false` 新規テスト全通過
2. iOS Simulator で Me タブを開き `docs/design/me/expect.html.png` と比較（アバター・氏名/email/View profile・2 セクション・赤字 Sign out 行）
3. Language/Appearance 行タップで ActionSheet 表示、Terms/Privacy タップで Linking
4. Sign out タップで確認 → サインアウト完了
5. `docker compose exec mobile npm run lint` / `typecheck` 通過
