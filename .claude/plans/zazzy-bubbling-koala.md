# Fix: GitHub Actions CI テスト失敗 (PR #59)

## Context

PR #59 の Editorial Archive デザインリデザインで、コミット `82d4726` にてテストファイルを `app/` から `__tests__/` に移動した。しかし、テストファイル内の相対インポートパスが更新されておらず、6つのテストスイートがモジュール解決エラーで失敗している。

## 修正内容

6つのテストファイルのインポートパスを修正する。

| テストファイル | 現在 (壊れている) | 修正後 |
|---|---|---|
| `__tests__/app/invite/accept-invite.test.tsx` | `../[token]` | `../../../app/invite/[token]` |
| `__tests__/app/walks/[id].test.tsx` | `../[id]` | `../../../app/walks/[id]` |
| `__tests__/app/dogs/dog-detail.test.tsx` | `../[id]/index` | `../../../app/dogs/[id]/index` |
| `__tests__/app/tabs/dogs.test.tsx` | `./dogs` | `../../../app/(tabs)/dogs` |
| `__tests__/app/walks/walk-detail.test.tsx` | `../[id]` | `../../../app/walks/[id]` |
| `__tests__/app/tabs/settings.test.tsx` | `./settings` | `../../../app/(tabs)/settings` |

注意: tabs のソースは `app/(tabs)/` (括弧付き Expo Router グループ) にある。

## 対象ファイル

すべて `apps/mobile/` 配下:
- `__tests__/app/invite/accept-invite.test.tsx` (line 4)
- `__tests__/app/walks/[id].test.tsx` (line 32)
- `__tests__/app/dogs/dog-detail.test.tsx` (line 3)
- `__tests__/app/tabs/dogs.test.tsx` (line 2)
- `__tests__/app/walks/walk-detail.test.tsx` (line 3)
- `__tests__/app/tabs/settings.test.tsx` (line 2)

## 検証

1. `docker compose run --rm mobile npx jest` でテストが全て通ることを確認
2. 修正後に push して CI が green になることを確認
