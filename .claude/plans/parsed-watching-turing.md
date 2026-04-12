# Fix: PR #60 Jest テスト失敗

## Context
PR #60 (Phase 2a — encounter detection and friendship system) の CI で Jest が1件失敗している。
`EncounterDetectionSection` コンポーネントのモックが `settings.test.tsx` に追加されていないため、`useQueryClient()` が `QueryClientProvider` なしで呼ばれてクラッシュしている。

## 修正内容

### ファイル: `apps/mobile/__tests__/app/tabs/settings.test.tsx`

既存のモック群（`ProfileSection`, `DogListSection`, `AppearanceSection`, `LogoutButton`）と同じパターンで `EncounterDetectionSection` のモックを追加する：

```ts
jest.mock('@/components/settings/EncounterDetectionSection', () => ({
  EncounterDetectionSection: () => null,
}));
```

追加位置: `AppearanceSection` モックの後、`LogoutButton` モックの前（L46〜L48 付近）

## 検証
- `docker compose exec mobile npx jest __tests__/app/tabs/settings.test.tsx` でテスト通過を確認
- 全テスト実行で他に影響がないことを確認
