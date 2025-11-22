-- Core schema for social activity feed

CREATE TABLE IF NOT EXISTS users (
    id           BIGSERIAL PRIMARY KEY,
    email        VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255)      NOT NULL,
    display_name VARCHAR(255)       NOT NULL,
    role         VARCHAR(20)        NOT NULL DEFAULT 'USER', -- USER | ADMIN | OWNER
    created_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT          NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted     BOOLEAN       NOT NULL DEFAULT FALSE,
    deleted_by  VARCHAR(20), -- ADMIN | OWNER | USER (self)
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS likes (
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    BIGINT      NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS follows (
    follower_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id BIGINT     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS blocks (
    blocker_id BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id)
);

-- Activity types: POST_CREATED, FOLLOWED, LIKED_POST, USER_DELETED, POST_DELETED
CREATE TABLE IF NOT EXISTS activities (
    id            BIGSERIAL PRIMARY KEY,
    actor_id      BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type          VARCHAR(50)   NOT NULL,
    target_user_id BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    post_id       BIGINT        REFERENCES posts(id) ON DELETE SET NULL,
    description   TEXT          NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
