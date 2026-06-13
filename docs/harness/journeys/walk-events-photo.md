# Journey: Walk Events And Photo

## Product Axes

- 犬の体験: meaningful moments during the walk are captured per dog.
- データによる散歩の最大化: timestamped events and photos enrich the walk timeline.
- 飼い主の貢献心: memorable evidence makes the owner's effort visible.
- Dog experience: records meaningful moments during a walk, including per-dog
  events and photos.
- Data-maximized walks: adds timestamped, typed, and optionally located events to
  the walk timeline.
- Owner contribution: gives the owner memorable evidence that the walk was active,
  responsive, and worth repeating.

## Scope

During an active walk, the owner records pee, poop, and photo events, then sees
those events on the map, timeline, and saved walk detail.

## Acceptance Criteria

- Event actions are disabled until there is an active walk.
- Single-dog walks record events for the selected dog.
- Multi-dog walks require choosing the dog for each event.
- Event coordinates use the latest known point when available.
- Photo events request camera permission, capture the image, upload through
  `StorageGateway`, and create the event only after upload succeeds.
- Failed record, presign, upload, or permission paths surface errors and do not
  create misleading event counts.
- Saved walk detail shows event markers and photo thumbnails.

## Evidence

- Maestro: `apps/mobile/e2e/maestro/walk-events-photo.yaml`.
- API: `recordWalkEvent` and photo upload GraphQL evidence.
- Storage: MinIO/S3 object evidence for photo flow when touched.
- Mobile: screenshot of recording controls and saved walk detail with events.
- Observability: API logs for event mutation and storage upload path.
