# Settings Screen Design Spec

**Status:** Approved
**Date:** 2026-03-23

## Overview

Walking Dog アプリの設定タブを実装する。iOS Settings 風のグループ化カードレイアウトで、プロフィール編集、犬一覧、テーマ/言語切替、サインアウト、バージョン表示を提供する。

## セクション構成

### 1. プロフィール
- 表示名を表示
- 「編集」ボタンでインライン編集フォームに切り替え
- TextInput + 「保存」/「キャンセル」ボタン
- API: `UPDATE_PROFILE_MUTATION`

### 2. 愛犬一覧
- `useMe()` の `dogs` 配列を表示
- 各犬: アイコン + 名前 + 犬種 + 「›」矢印
- タップで `/dogs/[id]` へ遷移
- 犬がいない場合: 空状態メッセージ

### 3. 外観
- **テーマ**: セグメントコントロール (ライト / ダーク / 自動)
  - 「自動」はデバイスの設定に従う
- **言語**: ドロップダウン (将来の言語追加を考慮)
  - 初期: 日本語 / English
- **永続化**: AsyncStorage (非機密データ)

### 4. サインアウト
- destructive ボタン
- `ConfirmDialog` で確認後、`useAuth().signOut()` を呼び出し
- ナビゲーションガードがログイン画面にリダイレクト

### 5. バージョン
- `expo-constants` から取得
- 画面下部に小さく表示

## データフロー

```
Settings Screen
├── useMe() → displayName, dogs[]
├── useUpdateProfile() → displayName 更新
├── useSettingsStore() → theme, language
│   ├── AsyncStorage → 永続化
│   └── i18n.changeLanguage() → 言語切替
└── useAuth().signOut() → トークンクリア → リダイレクト
```

## i18n キー

`settings` 名前空間に以下を追加:
- profile, displayName, edit, save, cancel, updateError
- dogs, noDogs
- appearance, theme, themeLight, themeDark, themeAuto
- language
- signOutConfirm
- version

## テーマ切替の実装

`useColorScheme()` の挙動を設定値で上書きする。
- `auto`: デバイスのシステム設定に従う (現在のデフォルト動作)
- `light` / `dark`: 固定値を返す

`Appearance.setColorScheme()` (React Native 0.72+) でアプリ全体のカラースキームを変更可能。
