CREATE SCHEMA history_insights;

CREATE TYPE history_insights.projection_status AS ENUM ('building', 'ready', 'active', 'failed', 'retired');

CREATE TABLE history_insights.projection_generations (
    generation_id UUID PRIMARY KEY,
    status history_insights.projection_status NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    activated_at TIMESTAMPTZ,
    failure_reason TEXT,
    CHECK (status <> 'active' OR activated_at IS NOT NULL)
);

CREATE UNIQUE INDEX history_one_active_generation_idx
    ON history_insights.projection_generations ((status))
    WHERE status = 'active';

CREATE TABLE history_insights.walk_history (
    generation_id UUID NOT NULL REFERENCES history_insights.projection_generations(generation_id) ON DELETE RESTRICT,
    walk_id UUID NOT NULL,
    user_id UUID NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    distance_meters BIGINT NOT NULL CHECK (distance_meters >= 0),
    duration_seconds BIGINT NOT NULL CHECK (duration_seconds >= 0),
    walker_display_name TEXT,
    walker_avatar_asset_id UUID,
    mood TEXT CHECK (mood IS NULL OR mood IN ('tired', 'okay', 'good', 'great')),
    weather TEXT,
    note TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    pee_count INTEGER NOT NULL CHECK (pee_count >= 0),
    poop_count INTEGER NOT NULL CHECK (poop_count >= 0),
    source_revision BIGINT NOT NULL CHECK (source_revision > 0),
    projected_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (generation_id, walk_id),
    CHECK (completed_at >= started_at)
);

CREATE INDEX history_walks_user_completed_idx
    ON history_insights.walk_history (generation_id, user_id, completed_at DESC, walk_id DESC);

CREATE TABLE history_insights.walk_participants (
    generation_id UUID NOT NULL,
    walk_id UUID NOT NULL,
    dog_id UUID NOT NULL,
    dog_name TEXT NOT NULL,
    dog_avatar_asset_id UUID,
    participant_order SMALLINT NOT NULL CHECK (participant_order > 0),
    PRIMARY KEY (generation_id, walk_id, dog_id),
    UNIQUE (generation_id, walk_id, participant_order),
    FOREIGN KEY (generation_id, walk_id)
        REFERENCES history_insights.walk_history(generation_id, walk_id) ON DELETE CASCADE
);

CREATE INDEX history_participants_dog_walk_idx
    ON history_insights.walk_participants (generation_id, dog_id, walk_id);

CREATE TABLE history_insights.walk_timeline_events (
    generation_id UUID NOT NULL,
    walk_id UUID NOT NULL,
    event_id UUID NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('pee', 'poop', 'photo')),
    occurred_at TIMESTAMPTZ NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    asset_id UUID,
    PRIMARY KEY (generation_id, event_id),
    FOREIGN KEY (generation_id, walk_id)
        REFERENCES history_insights.walk_history(generation_id, walk_id) ON DELETE CASCADE,
    CHECK ((latitude IS NULL) = (longitude IS NULL)),
    CHECK ((event_type = 'photo') = (asset_id IS NOT NULL))
);

CREATE INDEX history_timeline_walk_order_idx
    ON history_insights.walk_timeline_events (generation_id, walk_id, occurred_at, event_id);

CREATE TABLE history_insights.dog_goal_snapshots (
    generation_id UUID NOT NULL REFERENCES history_insights.projection_generations(generation_id) ON DELETE CASCADE,
    goal_id UUID NOT NULL,
    dog_id UUID NOT NULL,
    minutes INTEGER NOT NULL CHECK (minutes BETWEEN 1 AND 1440),
    cycle_days INTEGER NOT NULL CHECK (cycle_days IN (1, 7)),
    effective_from DATE NOT NULL,
    effective_to DATE,
    source_revision BIGINT NOT NULL CHECK (source_revision > 0),
    PRIMARY KEY (generation_id, goal_id),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE history_insights.consumed_events (
    generation_id UUID NOT NULL REFERENCES history_insights.projection_generations(generation_id) ON DELETE CASCADE,
    event_id UUID NOT NULL,
    provider TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_revision BIGINT NOT NULL,
    event_type TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL,
    payload_hash TEXT NOT NULL,
    PRIMARY KEY (generation_id, event_id)
);

CREATE UNIQUE INDEX history_consumed_revision_idx
    ON history_insights.consumed_events (generation_id, provider, aggregate_id, aggregate_revision, event_type);

CREATE TABLE history_insights.projection_checkpoints (
    generation_id UUID NOT NULL REFERENCES history_insights.projection_generations(generation_id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    stream_partition TEXT NOT NULL,
    stream_offset TEXT NOT NULL,
    last_event_id UUID,
    projected_through TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (generation_id, provider, stream_partition)
);
