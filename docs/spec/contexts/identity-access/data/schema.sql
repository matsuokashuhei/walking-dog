CREATE SCHEMA identity_access;

CREATE TYPE identity_access.user_status AS ENUM ('active', 'disabled');

CREATE TABLE identity_access.users (
    user_id UUID PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider = 'cognito'),
    provider_subject TEXT NOT NULL,
    email TEXT NOT NULL,
    email_verified BOOLEAN NOT NULL CHECK (email_verified),
    status identity_access.user_status NOT NULL DEFAULT 'active',
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT identity_users_provider_subject_unique UNIQUE (provider, provider_subject),
    CONSTRAINT identity_users_email_unique UNIQUE (email),
    CONSTRAINT identity_users_email_normalized CHECK (
        email = lower(btrim(email))
        AND octet_length(email) BETWEEN 3 AND 254
        AND position('@' IN email) > 1
    ),
    CONSTRAINT identity_users_timestamp_order CHECK (updated_at >= created_at)
);

CREATE TABLE identity_access.outbox_events (
    event_id UUID PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    aggregate_revision BIGINT NOT NULL CHECK (aggregate_revision > 0),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    CONSTRAINT identity_outbox_revision_unique UNIQUE (aggregate_id, aggregate_revision)
);

CREATE INDEX identity_outbox_unpublished_idx
    ON identity_access.outbox_events (occurred_at, event_id)
    WHERE published_at IS NULL;

