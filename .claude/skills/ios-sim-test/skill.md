---
name: ios-sim-test
description: iOS Simulator 上でネイティブアプリのテストを実行する。ios-simulator-skill のスクリプトを使ってUI操作・画面検証・スクリーンショット取得を行う。「シミュレータでテスト」「iOS テスト」「ネイティブアプリテスト」と言われたら使う。
---

# iOS Simulator テスト

ios-simulator-skill のスクリプトを使って iOS Simulator 上のアプリを操作・テストする。

## Prerequisites

### 1. Python 3.10+

システムの python3 は 3.9 で ios-simulator-skill の型構文（`str | None`）に対応していない。
Homebrew の Python 3.13 を使う：

```bash
PY=/opt/homebrew/bin/python3.13
```

Python 3.10+ がない場合：
```bash
brew install python@3.13
```

### 2. IDB (iOS Development Bridge)

screen_mapper.py, navigator.py 等のアクセシビリティ操作に必要。

```bash
# idb-companion (Homebrew)
brew tap facebook/fb && brew install idb-companion

# fb-idb Python パッケージ (venv 経由 — PEP 668 制約のため)
/opt/homebrew/bin/python3.13 -m venv /tmp/idb-venv
/tmp/idb-venv/bin/pip install fb-idb
```

### 3. PATH 設定

すべてのコマンド実行時に idb venv を PATH に含める：

```bash
export PATH="/tmp/idb-venv/bin:$PATH"
```

## 環境変数

毎回のコマンドで以下を設定する：

```bash
export PATH="/tmp/idb-venv/bin:$PATH"
export PY=/opt/homebrew/bin/python3.13
export SCRIPTS=/Users/matsuokashuhei/Development/walking-dog/.claude/skills/ios-simulator-skill/scripts
export UDID=$(xcrun simctl list devices booted -j | jq -r '.devices[][] | select(.state == "Booted") | .udid' | head -1)
```

## スクリプト実行パターン

### 環境確認
```bash
bash $SCRIPTS/sim_health_check.sh
```

### アプリ起動・終了
```bash
$PY $SCRIPTS/app_launcher.py --launch com.walkingdog.dev
$PY $SCRIPTS/app_launcher.py --terminate com.walkingdog.dev
```

### 画面分析（アサーション代わり）
```bash
# 簡易表示
$PY $SCRIPTS/screen_mapper.py

# 詳細（要素の型・ラベル一覧）
$PY $SCRIPTS/screen_mapper.py --verbose
```

### 要素の検索とタップ
```bash
# テキストで検索してタップ
$PY $SCRIPTS/navigator.py --find-text "Login" --tap

# テキスト + 型で絞り込み
$PY $SCRIPTS/navigator.py --find-text "Email" --find-type TextField --tap

# 同名要素が複数ある場合 (index で指定)
$PY $SCRIPTS/navigator.py --find-text "Delete" --find-type Button --index 1 --tap
```

### テキスト入力
```bash
# フィールドをタップしてからテキスト入力
$PY $SCRIPTS/navigator.py --find-text "Email" --find-type TextField --tap
$PY $SCRIPTS/keyboard.py --type "user@example.com"
```

### スクリーンショット
```bash
xcrun simctl io $UDID screenshot /path/to/screenshot.png
```

## テストワークフロー

### 1. 事前準備
```bash
# シミュレータとアプリの状態確認
bash $SCRIPTS/sim_health_check.sh
xcrun simctl list devices booted
xcrun simctl listapps $UDID 2>/dev/null | grep walkingdog
```

### 2. テスト実行パターン

各テストステップは以下のサイクルで実行：
1. **操作**: navigator.py でタップ / keyboard.py でテキスト入力
2. **待機**: `sleep 1-3` (API 呼び出しがある場合は長めに)
3. **検証**: screen_mapper.py で期待する要素の存在を確認
4. **記録**: xcrun simctl io でスクリーンショット取得

### 3. アプリ状態リセット
```bash
# 軽量リセット（サインアウト）
$PY $SCRIPTS/navigator.py --find-text "Sign Out" --tap

# 完全リセット（アプリ再インストール）
$PY $SCRIPTS/app_launcher.py --terminate com.walkingdog.dev
xcrun simctl uninstall $UDID com.walkingdog.dev
# 再ビルド・インストールが必要
```

## 注意事項

- **ラベルはシミュレータのロケールに依存**: 英語ロケールなら英語ラベル、日本語ロケールなら日本語ラベルで検索する
- **shell 環境は引き継がれない**: 各 Bash 呼び出しで `export PATH="/tmp/idb-venv/bin:$PATH"` が必要
- **idb venv は一時ディレクトリ**: `/tmp/idb-venv` はリブート時に消えるため、再作成が必要
- **Expo Go でのテスト**: `react-native-maps` 等のネイティブモジュールでエラーオーバーレイが出る場合は `navigator.py --find-text "Dismiss" --tap` で閉じる
- **確認コード**: cognito-local 使用時は `apps/cognito-local/db/local_2yovNmW0.json` から jq で取得可能
