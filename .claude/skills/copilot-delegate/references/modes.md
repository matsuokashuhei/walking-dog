# Modes Detail

3 モードそれぞれの詳細フロー。SKILL.md の Core Flow を補足する。

## parallel — 並列実装の分担

**前提**: 2 つ以上の **互いに独立した** タスク。同じファイルを触る競合があれば parallel ではなく single を選ぶ。

### 手順

1. **タスク分割の検証**
   - 各 task の影響ファイルが重ならないか確認（重なる場合は分割し直す）
   - 各 task は **15 分以内に Copilot が完結できる粒度** を目安にする（長すぎると失敗時の再投入コストが高い）

2. **session ディレクトリの作成**
   ```bash
   SESSION="$(date +%Y%m%d-%H%M)-${SHORT_NAME}"   # 例: 20260516-1500-dog-form
   mkdir -p "tasks/copilot/${SESSION}/logs"
   ```

3. **tasks.yaml を書く**
   - SKILL.md のフォーマット参照
   - `mode: parallel`, `language: ...`

4. **worktree を全 task 分作成**
   ```bash
   for TASK_ID in rename-fields extract-validator; do
     git worktree add ".claude/worktrees/copilot-${TASK_ID}" -b "copilot/${TASK_ID}"
   done
   ```

5. **全 task を `run_in_background: true` で同時起動**
   - 同じ message で複数の Bash tool 呼び出しを並べる
   - 各 Bash は `copilot -p ...` を 1 つ起動して即終了する形に組み立てる
   - 出力は `tasks/copilot/${SESSION}/logs/${TASK_ID}.log` に redirect

6. **完了通知を待つ**
   - 各バックグラウンドプロセスから完了通知が届くたびに：
     - 終了コードをチェック
     - `git -C <worktree> diff --stat` を取る
     - `results.md` に 1 ブロック追記
   - 通知が来るまで poll しない（指示違反）

7. **結合判断**
   - 全 task 完了後、各 worktree の diff を **Claude が直接 Read で読む**
   - 矛盾・スタイル不一致・テスト破壊などを検出
   - ユーザーに「3 つとも採用」「2 つ採用 1 つ修正」など方針を提示

### Failure handling

1 task が失敗しても他は続行。failed task は `results.md` に `status: failed` で記録、ユーザーに再投入 or 撤退を相談。

---

## single — 重い単発タスク

**用途**: 1 つの実装が大きく、Claude のコンテキストを圧迫しそうなとき。worktree は **現在のもの** を流用する（新規作成しない）。

### 手順

1. **session 作成（worktree は流用なので軽量）**
   ```bash
   SESSION="$(date +%Y%m%d-%H%M)-${SHORT_NAME}"
   mkdir -p "tasks/copilot/${SESSION}/logs"
   ```

2. **タスク説明を厚めに書く**
   - Copilot はプロジェクトの memory を見えないので、**Claude が context を圧縮して渡す** 必要がある
   - 含めるべき要素:
     - 触るべきファイル一覧（絶対パス or プロジェクトルートからの相対）
     - 関連する型定義・interface
     - プロジェクトルール（Docker 経由、tokens.ts 利用など — `Project-Specific Constraints` から該当分を抜粋）
     - 受け入れ基準（テストが通る、Lint clean、UI で見て自然 など）

3. **Copilot 起動（フォアグラウンドでも非同期でも可）**
   ```bash
   copilot -p "${TASK_DESCRIPTION}" \
     -C "$(pwd)" \
     ${COMMON_ALLOW_DENY} \
     ${LANGUAGE_SPECIFIC_ALLOW_DENY} \
     | tee "tasks/copilot/${SESSION}/logs/main.log"
   ```

4. **完了後の検証**
   - Claude が `git status` / `git diff` で変更を確認
   - 必要なら lint / test を走らせる
   - 不備があれば Copilot に追加指示するか、Claude が手当てする

### Failure handling

`single` で失敗した場合、現在の worktree が中途半端な状態になりうる。
- `git stash` で Copilot の変更を一旦退避してから判断
- 完全に捨てるなら `git restore --staged --worktree .`
- 部分採用するなら hunk 単位で `git add -p`

---

## second-opinion — 代替実装の比較

**用途**: 既に実装済みのコード（Claude 産 or 人間産）に対し、Copilot の代替案を取って比較したいとき。

### 手順

1. **基準コミット sha を控える**
   ```bash
   BASELINE_SHA=$(git rev-parse HEAD)
   echo "${BASELINE_SHA}" > "tasks/copilot/${SESSION}/baseline.sha"
   ```

2. **代替案用 worktree を作成**
   - 元実装の **直前のコミット** から分岐するのがポイント（Copilot が元実装を見ずに同じ仕様を実装できる状態にする）
   ```bash
   # 元実装が HEAD のみのコミットだった場合
   PRE_SHA=$(git rev-parse HEAD^)
   git worktree add ".claude/worktrees/copilot-alt" "${PRE_SHA}"
   cd ".claude/worktrees/copilot-alt"
   git checkout -b copilot/alternative
   ```

3. **タスク説明には「仕様だけ」を書く**
   - 元の実装コードは渡さない（バイアスが入る）
   - 仕様・受け入れ基準・触るべきファイル一覧だけ

4. **Copilot 起動 → 完了待ち**
   - `single` と同様

5. **比較レポート作成**

   ```markdown
   # Second Opinion: ${TOPIC}

   ## Baseline (Claude / 人間 実装)
   - 行数: 87
   - 抽象化: 関数 3 つ
   - 依存追加: なし

   ## Alternative (Copilot)
   - 行数: 64
   - 抽象化: 関数 1 つ + クラス
   - 依存追加: lodash

   ## 差分要約
   - Copilot は lodash で簡潔だがプロジェクトポリシーで lodash 不使用
   - Claude 版は依存ゼロだが冗長
   ```

6. **判断をユーザーに返す**
   - Claude が一方的に採用判断しない
   - 長所短所と推奨を述べて user に decide してもらう

### Failure handling

代替案が失敗した場合は worktree を破棄して終了。baseline は元のまま残っているので影響なし。

---

## Mode 選択の補助

ユーザーが mode を明示しなかったとき、Claude は以下のフローで提案する：

```
1. タスク数 = N
2. N >= 2 かつ 各タスクが独立 → parallel を提案
3. N == 1 かつ 影響範囲広い → single を提案
4. N == 1 かつ 「比較」「代替」「セカンドオピニオン」キーワード → second-opinion を提案
5. 上記いずれも当てはまらない → ユーザーに mode を聞く
```

迷ったら **`single` がデフォルト**（worktree 作成不要で副作用が小さい）。
