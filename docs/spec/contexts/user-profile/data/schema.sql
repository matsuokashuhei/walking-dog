CREATE SCHEMA user_profile;

CREATE TYPE user_profile.unit_system AS ENUM ('metric', 'imperial');
CREATE TYPE user_profile.appearance AS ENUM ('system', 'light', 'dark');

CREATE TABLE user_profile.user_profiles (
    user_id UUID PRIMARY KEY,
    display_name TEXT NOT NULL,
    avatar_asset_id UUID,
    locale TEXT NOT NULL DEFAULT 'ja-JP' CHECK (locale IN ('ja-JP', 'en-US')),
    unit_system user_profile.unit_system NOT NULL DEFAULT 'metric',
    appearance user_profile.appearance NOT NULL DEFAULT 'system',
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT user_profiles_display_name CHECK (
        display_name = btrim(display_name)
        AND char_length(display_name) BETWEEN 1 AND 80
    ),
    CONSTRAINT user_profiles_timestamp_order CHECK (updated_at >= created_at)
);

CREATE TABLE user_profile.outbox_events (
    event_id UUID PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    aggregate_revision BIGINT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    UNIQUE (aggregate_id, aggregate_revision)
);

CREATE INDEX user_profile_outbox_unpublished_idx
    ON user_profile.outbox_events (occurred_at, event_id)
    WHERE published_at IS NULL;

