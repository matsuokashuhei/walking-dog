# Design: Fix Edit Dog Profile Photo Upload (Content-Type Mismatch)

- Date: 2026-04-12
- Status: Draft
- Scope: Bug fix (API + Mobile)
- Affected environments: Local (LocalStack), Sakura VPS, AWS

## 1. Purpose and Background

Users cannot upload a dog photo from the Edit Dog Profile screen on mobile.
Both local development (LocalStack) and the Sakura VPS test environment fail.

### Root cause

The backend generates the S3 presigned PUT URL with a hard-coded
`content_type("image/jpeg")` in `apps/api/src/services/s3_service.rs:26`.
AWS SigV4 signs the `Content-Type` header as part of the request signature.

On the mobile side, the `PhotoPicker` already extracts the real MIME type from
the picker asset (`apps/mobile/components/dogs/PhotoPicker.tsx:32`) and
`uploadToPresignedUrl` sends it in the PUT request header
(`apps/mobile/lib/upload.ts:20`).

When the asset is `image/png` or `image/heic`, the header and the signature no
longer match, so S3 (and LocalStack) reject the PUT with
`403 SignatureDoesNotMatch`.

This is a single bug in shared API code, which is why every environment is
affected.

## 2. Scope

### In scope

- Thread an explicit `contentType` argument through the GraphQL mutation
  `generateDogPhotoUploadUrl` to `s3_service::generate_dog_photo_upload_url`.
- Server-side allow-list validation of `contentType` to prevent abuse.
- Key extension derived from the content type (so `.jpg` / `.png` / `.heic`
  match actual bytes — useful for CDN `Content-Type` sniffing and cleaner URLs).
- Mobile: pass the MIME type from `PhotoPicker` through
  `useGeneratePhotoUploadUrl` into the mutation.
- Update unit test + E2E test to cover the new argument.

### Out of scope

- Image transcoding / resizing on client or server.
- Migrating existing photos.
- Changing the S3 bucket policy or CORS.
- HEIC → JPEG conversion (Expo `launchImageLibraryAsync` already returns
  JPEG when `allowsEditing: true` on iOS in most cases; we accept HEIC as a
  hedge but do not transcode).

## 3. Technical Approach

### 3.1 GraphQL schema change

Add a required `contentType: String!` argument to `generateDogPhotoUploadUrl`:

```graphql
generateDogPhotoUploadUrl(dogId: ID!, contentType: String!): PresignedUrlOutput!
```

Required, not optional, to force callers to be explicit and to prevent
silent regressions if mobile forgets to pass it.

### 3.2 Allow-list

Accept exactly these MIME types (matching what `expo-image-picker` returns):

- `image/jpeg`
- `image/png`
- `image/heic`
- `image/heif`
- `image/webp`

Any other value returns a GraphQL error `Unsupported content type`.

### 3.3 S3 key extension

Map content type to extension so the S3 key matches the bytes:

| content_type  | extension |
|---------------|-----------|
| `image/jpeg`  | `.jpg`    |
| `image/png`   | `.png`    |
| `image/heic`  | `.heic`   |
| `image/heif`  | `.heif`   |
| `image/webp`  | `.webp`   |

The S3 key becomes `dogs/{dog_id}/{uuid}.{ext}`.

### 3.4 Call chain

```
Mobile PhotoPicker (asset.mimeType)
   → handlePhotoChange(uri, contentType)
   → useGeneratePhotoUploadUrl({ dogId, contentType })   // mutation variable
   → GraphQL generateDogPhotoUploadUrl(dogId, contentType)
   → s3_service::generate_dog_photo_upload_url(s3, bucket, dog_id, content_type)
   → s3.put_object().content_type(content_type)          // signed value
   → mobile PUT with matching Content-Type header        // signature matches
```

### 3.5 Alternatives considered

1. **Unsigned content-type (presign without `.content_type()`)** — rejected:
   client-supplied header would still be part of SigV4 if the SDK includes it,
   and dropping it loses server-side type tracking.
2. **Force mobile to always send `image/jpeg` and transcode locally** —
   rejected: extra client work, possible quality loss, does not solve HEIC
   upload path without a converter dependency.
3. **Optional `contentType` with `image/jpeg` fallback** — rejected: hides
   the bug. We want explicit failure if the caller forgets.

Chosen: **3.1–3.4** above.

## 4. Test Strategy

### 4.1 API unit / integration (Rust, Docker)

- Update `apps/api/tests/test_dog.rs::test_generate_dog_photo_upload_url`
  to pass `contentType: "image/png"` and assert the returned `key` ends with
  `.png`.
- Add `test_generate_dog_photo_upload_url_rejects_invalid_content_type` that
  sends `contentType: "application/pdf"` and asserts a GraphQL error.
- Run via Docker Compose:
  `docker compose -f apps/compose.yml run --rm api cargo test test_generate_dog_photo_upload_url -- --nocapture`.

### 4.2 E2E (Playwright, Docker)

- Update `apps/e2e/tests/api/photo.spec.ts` to pass `contentType: 'image/jpeg'`.
- Add a case for PNG that asserts the key ends with `.png`.
- Run via Docker Compose:
  `docker compose -f apps/compose.yml --profile e2e run --rm e2e npx playwright test --project API tests/api/photo.spec.ts`.

### 4.3 Manual mobile verification

- Local: build the mobile app against LocalStack API, open Edit Dog Profile,
  pick a PNG from the iOS Simulator photo library, confirm upload succeeds
  (no `Upload failed` alert) and new photo renders.
- Repeat with a JPEG image to confirm no regression.

## 5. Risks

- **Clients on old builds** will send the mutation without `contentType` and
  get a GraphQL argument error. Mitigation: ship this as a bug fix — users
  currently get a 403 anyway, so the failure mode is no worse.
- **Unknown MIME types returned by Expo on Android** — Android often returns
  `image/jpeg` for gallery images; `image/webp` covers modern Android cases.
  If we see reports of unsupported types in the wild, we extend the allow-list.
