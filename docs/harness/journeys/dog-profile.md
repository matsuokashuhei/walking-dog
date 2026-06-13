# Journey: Dog Profile

## Product Axes

- 犬の体験: dog identity makes each walk specific to a real companion.
- データによる散歩の最大化: profile data powers selection, history, and summaries.
- 飼い主の貢献心: recognizable dog profiles make care feel personal.
- Dog experience: records the dog's identity so walks and encounters can be
  understood per dog, not as generic owner activity.
- Data-maximized walks: stores profile attributes used by walk selection, history,
  and per-dog summaries.
- Owner contribution: lets the owner see a recognizable dog profile and feel that
  walks are being given to a specific companion.

## Scope

An authenticated owner adds a dog, views the dog in the pack, opens the detail
screen, edits profile fields, and optionally changes the photo.

## Acceptance Criteria

- Dog creation requires name and gender.
- Breed and birthday can be saved when provided.
- The dog appears in the Dogs list and can be opened by name.
- Detail shows stats, goal progress, and walk history area for that dog.
- Edit updates visible profile fields.
- Photo upload goes through `StorageGateway`; S3/MinIO details do not leak into
  GraphQL or mobile UI logic.
- Destructive dog removal stays in the edit flow, not the detail view.

## Evidence

- Maestro: `apps/mobile/e2e/maestro/dog-profile.yaml`.
- API: `createDog` and `updateDog` GraphQL evidence, plus storage evidence when
  photo is touched.
- Mobile: screenshot of Dogs list and Dog Profile after save.
- Observability: API logs for dog mutation and storage path, with no raw photo or
  credential leakage.
