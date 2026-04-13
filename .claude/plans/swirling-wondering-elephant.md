# Plan: Google Stitch 向け UIリデザインプロンプト作成

## Context

walking-dog アプリのブランドイメージを確立するため、UIを全面リデザインする。デザインに特化した AI ツール **Google Stitch** にモックアップ画像を生成してもらうための依頼プロンプトを作成する。

背景仕様: `docs/specs/2026-04-05-ui-redesign-design-system.md`

## インタビューで確定した方針

| 項目 | 決定 |
|------|------|
| ツール | Google Stitch (stitch.withgoogle.com) |
| 成果物 | モックアップ画像 |
| ブランド | Notion風モノクロ — Clean, editorial, spacious |
| カラー | モノクロのみ（アクセントカラーなし） |
| ダークモード | 必要だが最初はライトモードで生成 |
| 優先画面 | ホーム（散歩履歴）、散歩中（記録画面）、犬詳細、設定 |
| 入力情報 | 機能一覧 + データ構造のみ（既存UIのスクショは見せない） |
| ダミーデータ | 英語のリアルなデータ |
| プロンプト言語 | 英語 |

## 成果物

`docs/specs/2026-04-05-stitch-prompt.md` に以下を含むプロンプトドキュメントを作成する：

1. **Stitch Vibe Design プロンプト** — ブランド方針・雰囲気の指定
2. **Multi-screen プロンプト** — 4画面の機能仕様 + データ構造
3. **フォローアッププロンプト** — 残りの画面（犬一覧、ログイン/登録、招待承認）+ ダークモード版

## Step 1: プロンプト作成

`docs/specs/2026-04-05-stitch-prompt.md` を作成する。以下の構成：

### Part A: Vibe & Brand Direction
Stitch の Vibe Design 向け。ブランドの雰囲気をテキストで伝える部分。
- Notion-inspired, monochrome, typographic brand
- Clean, editorial, spacious
- No accent colors — black, white, grays only
- System font (San Francisco / Roboto)
- Dog walking app だが「可愛い」路線ではなく、洗練された tool 路線

### Part B: Screen Specifications (4 screens)
各画面の機能・データ構造・レイアウト要素を具体的に記述。

**Screen 1: Home (Walk History)**
- List of past walks
- Each item: date, dog names, duration, distance
- Optional: walker name (for shared dogs)
- Empty state when no walks

**Screen 2: Walk Recording (Active Walk)**
- Map with route polyline
- Timer (elapsed time)
- Distance counter
- Stop button
- Selected dogs indicator

**Screen 3: Dog Detail**
- Dog photo (large, centered)
- Name + breed
- Stats: total walks, total distance, total duration
- Family members list (avatar, name, role)
- Edit / Delete actions

**Screen 4: Settings**
- Profile section (display name, editable)
- Dogs list (navigate to detail)
- Appearance (Light/Dark/Auto toggle)
- Language selector
- Logout button
- App version

### Part C: Follow-up Prompts
残りの画面とダークモードバリエーション用のプロンプト案。

## Step 2: ユーザーレビュー

プロンプトを作成後、ユーザーに確認してもらう。

## 対象ファイル

| ファイル | 操作 |
|---------|------|
| `docs/specs/2026-04-05-stitch-prompt.md` | 新規作成 |

## 検証方法

- 作成したプロンプトを stitch.withgoogle.com に貼り付けて生成を試す
- 生成されたモックアップが仕様書のブランド方針（モノクロ、Notion風）に合致しているか確認
