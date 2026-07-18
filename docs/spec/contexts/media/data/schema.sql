CREATE SCHEMA media;

CREATE TYPE media.asset_purpose AS ENUM ('user_avatar', 'dog_avatar', 'walk_photo');
CREATE TYPE media.asset_status AS ENUM ('pending_upload', 'processing', 'ready', 'rejected', 'deleted');

CREATE TABLE media.media_assets (
    media_asset_id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL,
    purpose media.asset_purpose NOT NULL,
    status media.asset_status NOT NULL,
    object_key TEXT NOT NULL UNIQUE,
    content_type TEXT,
    byte_size BIGINT CHECK (byte_size > 0),
    sha256 CHAR(64),
    pixel_width INTEGER CHECK (pixel_width > 0),
    pixel_height INTEGER CHECK (pixel_height > 0),
    rejection_code TEXT,
    upload_expires_at TIMESTAMPTZ NOT NULL,
    ready_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT media_assets_ready_fields CHECK (
        status <> 'ready' OR (
            content_type IN ('image/jpeg', 'image/png')
            AND byte_size IS NOT NULL
            AND sha256 ~ '^[0-9a-f]{64}$'
            AND pixel_width IS NOT NULL
            AND pixel_height IS NOT NULL
            AND ready_at IS NOT NULL
        )
    ),
    CONSTRAINT media_assets_deleted_at CHECK (status <> 'deleted' OR deleted_at IS NOT NULL),
    CONSTRAINT media_assets_timestamp_order CHECK (updated_at >= created_at)
);

CREATE INDEX media_assets_owner_created_idx
    ON media.media_assets (owner_user_id, created_at DESC, media_asset_id DESC);

CREATE INDEX media_assets_expired_pending_idx
    ON media.media_assets (upload_expires_at, media_asset_id)
    WHERE status = 'pending_upload';

CREATE TABLE media.outbox_events (
    event_id UUID PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    aggregate_revision BIGINT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    UNIQUE (aggregate_id, aggregate_revision)
);

CREATE INDEX media_outbox_unpublished_idx
    ON media.outbox_events (occurred_at, event_id)
    WHERE published_at IS NULL;

