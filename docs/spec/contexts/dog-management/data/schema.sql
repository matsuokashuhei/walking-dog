CREATE SCHEMA dog_management;

CREATE TYPE dog_management.dog_gender AS ENUM ('female', 'male', 'other');
CREATE TYPE dog_management.dog_status AS ENUM ('active', 'removed');
CREATE TYPE dog_management.dog_role AS ENUM ('owner', 'walker');

CREATE TABLE dog_management.dogs (
    dog_id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    breed TEXT,
    gender dog_management.dog_gender NOT NULL,
    birthday DATE,
    avatar_asset_id UUID,
    status dog_management.dog_status NOT NULL DEFAULT 'active',
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    removed_at TIMESTAMPTZ,
    CONSTRAINT dogs_name CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 80),
    CONSTRAINT dogs_breed CHECK (breed IS NULL OR (breed = btrim(breed) AND char_length(breed) BETWEEN 1 AND 120)),
    CONSTRAINT dogs_removed_at CHECK (status <> 'removed' OR removed_at IS NOT NULL),
    CONSTRAINT dogs_timestamp_order CHECK (updated_at >= created_at)
);

CREATE TABLE dog_management.user_dog_roles (
    user_dog_role_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    dog_id UUID NOT NULL REFERENCES dog_management.dogs(dog_id) ON DELETE RESTRICT,
    role dog_management.dog_role NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    CONSTRAINT user_dog_roles_ended CHECK (active OR ended_at IS NOT NULL)
);

CREATE UNIQUE INDEX user_dog_roles_active_unique_idx
    ON dog_management.user_dog_roles (user_id, dog_id, role)
    WHERE active;

CREATE INDEX user_dog_roles_user_active_idx
    ON dog_management.user_dog_roles (user_id, created_at, dog_id)
    WHERE active;

CREATE TABLE dog_management.dog_walk_goals (
    goal_id UUID PRIMARY KEY,
    dog_id UUID NOT NULL REFERENCES dog_management.dogs(dog_id) ON DELETE RESTRICT,
    minutes INTEGER NOT NULL CHECK (minutes BETWEEN 1 AND 1440),
    cycle_days INTEGER NOT NULL CHECK (cycle_days IN (1, 7)),
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_by_user_id UUID NOT NULL,
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL,
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX dog_walk_goals_dog_effective_idx
    ON dog_management.dog_walk_goals (dog_id, effective_from DESC, goal_id DESC);

-- The platform provisions btree_gist before applying this context schema.
ALTER TABLE dog_management.dog_walk_goals
    ADD CONSTRAINT dog_walk_goals_no_overlap
    EXCLUDE USING gist (
        dog_id WITH =,
        daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&
    );

CREATE TABLE dog_management.outbox_events (
    event_id UUID PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    aggregate_revision BIGINT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    UNIQUE (aggregate_id, aggregate_revision, event_type)
);

CREATE INDEX dog_management_outbox_unpublished_idx
    ON dog_management.outbox_events (occurred_at, event_id)
    WHERE published_at IS NULL;
