# Dog Photo — Server-Constructed URLs, Instant Preview, Prod Env

## Context

VPS で Edit Dog Profile の写真が表示・保存されないバグ。PR #75 ([feat/cloudfront-dog-photos](https://github.com/matsuokashuhei/walking-dog/pull/75)) で CloudFront distribution (`https://d1idixueiq8qgh.cloudfront.net`) + OAC を作成し、モバイルが `extra.photoCdnUrl` から URL を組み立てる形にしたため配信経路は通る。

残課題はアーキテクチャの整理とUX：

1. **クライアントで URL を組み立てるのをやめる**（ユーザー要望）。API が完全な photo URL を返す設計に変更し、mobile は `dog.photoUrl` をそのまま表示に使う。モバイル側の `PHOTO_CDN_URL` 環境変数依存も消えるため prod build で壊れるリスクが無くなる。
2. **即時プレビュー**。写真ピック直後はまだアップロード完了前なので古い画像が見える。ローカル URI で即時反映する。
3. **VPS env 配布**。API 側のみ `PHOTO_CDN_URL` を持てば十分になる。

## Approach

### API (`apps/api/`)
- `src/config.rs`: `photo_cdn_url: String` を追加。`PHOTO_CDN_URL` env から読み、デフォルトは local dev 用の `http://localhost:4566/dog-photos`
- `src/graphql/custom_mutations.rs` の `photoUrl` Field resolver（line 132 付近）で、DB の key に CDN URL を prefix して返す。既に `http` で始まる値はそのまま返す（後方互換）
- 同じ resolver 展開を他の Dog 系 output type（`FriendDogOutput` など `photo_url` を露出しているもの）にも適用。`rg "photo_url" apps/api/src/graphql/` で全箇所洗い出す
- DB スキーマは変更なし（key のまま保存）。`updateDog` の input も key を受ける現状維持

### Mobile (`apps/mobile/`)
- `lib/photo-url.ts` と `lib/photo-url.test.ts` を削除
- `getPhotoUrl(dog.photoUrl) ?? require('@/assets/images/icon.png')` → `dog.photoUrl ?? require(...)` に全箇所置換（`rg "getPhotoUrl" apps/mobile/` で洗い出し、`app-example/` は無視）
- `app.config.ts` から `extra.photoCdnUrl` を削除
- `.env.{local,development,production}` から `PHOTO_CDN_URL` を削除
- `app/dogs/[id]/edit.tsx` に即時プレビューを追加：
  ```tsx
  const [preview, setPreview] = useState<string | null>(null);
  async function handlePhotoChange(uri, contentType) {
    setPreview(uri);            // 即時反映
    setPhotoLoading(true);
    try {
      const { url, key } = await generateUploadUrl({ dogId: id, contentType });
      await uploadToPresignedUrl(url, uri, contentType);
      await updateDog({ id, input: { photoUrl: key } });
      setPreview(null);          // refetch 済みの dog.photoUrl に委譲
    } catch { ... }
    finally { setPhotoLoading(false); }
  }
  <PhotoPicker currentPhotoUrl={preview ?? dog.photoUrl} ... />
  ```

### Infra
- `infra/sakura/.env.example` に `PHOTO_CDN_URL=https://d1idixueiq8qgh.cloudfront.net` を追記
- `apps/compose.yml` の `api` サービスに `PHOTO_CDN_URL` を環境変数として渡す行を追加（local dev 用）
- VPS 上の実際の `.env` へ手動で追記（deploy note）

## Critical Files

**Edit:**
- `apps/api/src/config.rs`
- `apps/api/src/graphql/custom_mutations.rs` (photoUrl resolver と他の dog photo 露出箇所)
- `apps/mobile/app.config.ts`
- `apps/mobile/app/dogs/[id]/edit.tsx`
- `apps/mobile/app/dogs/[id]/index.tsx`
- `apps/mobile/app/dogs/[id]/friends/[friendDogId].tsx`
- `apps/mobile/components/dogs/DogListItem.tsx`
- `apps/mobile/components/dogs/EncounterCard.tsx`
- `apps/mobile/components/dogs/FriendCard.tsx`
- `apps/mobile/.env.local`, `.env.development`, `.env.production`
- `apps/compose.yml`
- `infra/sakura/.env.example`

**Delete:**
- `apps/mobile/lib/photo-url.ts`
- `apps/mobile/lib/photo-url.test.ts`

**Reuse:**
- `apps/api/src/graphql/custom_mutations.rs:132` の resolver パターン
- `apps/mobile/components/dogs/PhotoPicker.tsx` はそのまま（表示 URL を受けるだけ）
- `apps/mobile/hooks/use-dog-mutations.ts` の invalidation は既に OK

## Verification

1. **API 単体テスト**: `docker compose -f apps/compose.yml run --rm api cargo test` — 既存テスト緑維持。`photoUrl` field resolver のテストに CDN prefix ケースを追加
2. **Mobile 単体テスト**: `docker run --rm -v "$(pwd)/apps/mobile:/app" -w /app node:20 npx jest` — 全158 tests 緑維持（photo-url.test.ts 削除後）
3. **Local E2E**: `scripts/setup.sh` で localstack 準備後、mobile dev build で写真ピック → 即時プレビュー → アップロード完了 → アプリ再起動しても写真表示されること
4. **VPS E2E**: VPS `.env` に `PHOTO_CDN_URL` 設定 → api redeploy → `eas build --profile development` (or `expo start` で LAN IP 経由) → Edit Dog Profile で写真ピック → 即時プレビュー → UPDATE 不要で自動保存 → アプリ再起動後も CloudFront から配信されていることを確認
5. **CloudFront curl 確認**: `curl -I https://d1idixueiq8qgh.cloudfront.net/dogs/{id}/{key}.jpg` → `HTTP/2 200`

## Out of Scope

- Race condition 対策（picker と submit の同時実行）: 現状 handlePhotoChange は pick 時に即保存し、UPDATE ボタンは name/breed/gender のみ送信する設計。ユーザ操作上レースは実害がないため今回は対応しない
- Production `.env.production` の CloudFront URL 設定: 別 distribution が必要になった段階で対応
