CREATE SCHEMA walk_session;

CREATE TYPE walk_session.walk_status AS ENUM ('starting', 'active', 'finishing', 'completed', 'abandoned');
CREATE TYPE walk_session.care_event_type AS ENUM ('pee', 'poop');
CREATE TYPE walk_session.walk_mood AS ENUM ('tired', 'okay', 'good', 'great');

CREATE TABLE walk_session.walks (
    walk_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    status walk_session.walk_status NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finish_requested_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    abandoned_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CHECK (updated_at >= created_at),
    CHECK (completed_at IS NULL OR completed_at >= started_at),
    CHECK (abandoned_at IS NULL OR abandoned_at >= started_at),
    CHECK (status <> 'completed' OR completed_at IS NOT NULL),
    CHECK (status <> 'abandoned' OR abandoned_at IS NOT NULL)
);

CREATE UNIQUE INDEX walk_session_one_in_progress_per_user_idx
    ON walk_session.walks (user_id)
    WHERE status IN ('starting', 'active', 'finishing');

CREATE TABLE walk_session.walk_participants (
    walk_id UUID NOT NULL REFERENCES walk_session.walks(walk_id) ON DELETE RESTRICT,
    dog_id UUID NOT NULL,
    dog_name TEXT NOT NULL CHECK (dog_name = btrim(dog_name) AND char_length(dog_name) BETWEEN 1 AND 80),
    avatar_asset_id UUID,
    participant_order SMALLINT NOT NULL CHECK (participant_order > 0),
    PRIMARY KEY (walk_id, dog_id),
    UNIQUE (walk_id, participant_order)
);

CREATE TABLE walk_session.walk_care_events (
    event_id UUID PRIMARY KEY,
    walk_id UUID NOT NULL REFERENCES walk_session.walks(walk_id) ON DELETE RESTRICT,
    sequence INTEGER NOT NULL CHECK (sequence > 0),
    event_type walk_session.care_event_type NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (walk_id, sequence),
    CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE TABLE walk_session.walk_photos (
    walk_id UUID NOT NULL REFERENCES walk_session.walks(walk_id) ON DELETE RESTRICT,
    asset_id UUID NOT NULL,
    photo_order SMALLINT NOT NULL CHECK (photo_order > 0),
    attached_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (walk_id, asset_id),
    UNIQUE (walk_id, photo_order)
);

CREATE TABLE walk_session.walk_completions (
    walk_id UUID PRIMARY KEY REFERENCES walk_session.walks(walk_id) ON DELETE RESTRICT,
    track_summary_version INTEGER NOT NULL CHECK (track_summary_version > 0),
    distance_meters INTEGER NOT NULL CHECK (distance_meters >= 0),
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
    note TEXT CHECK (note IS NULL OR char_length(note) <= 1000),
    mood walk_session.walk_mood,
    weather TEXT CHECK (weather IS NULL OR (weather = btrim(weather) AND char_length(weather) BETWEEN 1 AND 80)),
    tags TEXT[] NOT NULL DEFAULT '{}',
    metadata_skipped BOOLEAN NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    CHECK (cardinality(tags) <= 10)
);

CREATE TABLE walk_session.idempotency_records (
    user_id UUID NOT NULL,
    operation TEXT NOT NULL,
    request_id UUID NOT NULL,
    input_hash TEXT NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, operation, request_id)
);

CREATE TABLE walk_session.outbox_events (
    event_id UUID PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    aggregate_revision BIGINT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    UNIQUE (aggregate_id, aggregate_revision, event_type)
);

CREATE INDEX walk_session_outbox_unpublished_idx
    ON walk_session.outbox_events (occurred_at, event_id)
    WHERE published_at IS NULL;
