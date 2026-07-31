-- =============================================================
-- Gym App — SQLite Schema
-- =============================================================

PRAGMA foreign_keys = ON;

-- -------------------------------------------------------------
-- exercises
-- Reference table. Seeded once, user can add over time.
-- -------------------------------------------------------------
CREATE TABLE exercises (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    category    TEXT    NOT NULL,   -- pull | push | compound | core | conditioning | olympic | kettlebell | skill
    equipment   TEXT    NOT NULL,   -- bodyweight | barbell | kettlebell | dumbbell | machine | cable
    notes       TEXT
);

-- -------------------------------------------------------------
-- programmes
-- Extracted from Sessions.Programme — currently a free-text
-- string. Normalised here so it can be managed properly.
-- -------------------------------------------------------------
CREATE TABLE programmes (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    notes       TEXT
);

-- -------------------------------------------------------------
-- sessions
-- One row per workout.
-- -------------------------------------------------------------
CREATE TABLE sessions (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    date            TEXT    NOT NULL,       -- ISO 8601: YYYY-MM-DD
    programme_id    INTEGER REFERENCES programmes(id) ON DELETE SET NULL,
    notes           TEXT
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_programme ON sessions(programme_id);

-- -------------------------------------------------------------
-- sets
-- One row per set within a session.
-- Sparse by design — most columns are NULL for any given set
-- (e.g. a bodyweight exercise won't have weight_kg).
-- -------------------------------------------------------------
CREATE TABLE sets (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_id     INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    set_number      INTEGER NOT NULL,
    reps            INTEGER,
    weight_kg       REAL,
    weight_note     TEXT,           -- 'bodyweight' | 'bodyweight+10' | NULL
    duration_min    REAL,
    distance_m      REAL,
    speed_kmh       REAL,
    rest_min        REAL,
    is_ladder       INTEGER NOT NULL DEFAULT 0,   -- boolean: 0 | 1
    ladder_step     INTEGER,
    notes           TEXT
);

CREATE INDEX idx_sets_session    ON sets(session_id);
CREATE INDEX idx_sets_exercise   ON sets(exercise_id);

-- -------------------------------------------------------------
-- body_composition
-- One row per measurement. Not necessarily daily.
-- -------------------------------------------------------------
CREATE TABLE body_composition (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    date            TEXT    NOT NULL,           -- ISO 8601: YYYY-MM-DD
    bodyweight_kg   REAL    NOT NULL,
    body_fat_pct    REAL,
    UNIQUE(user_id, date)
);

CREATE INDEX idx_body_composition_user ON body_composition(user_id);
CREATE INDEX idx_body_composition_date ON body_composition(date);

-- -------------------------------------------------------------
-- users
-- Single-user for now. Structure supports multi-user later.
-- -------------------------------------------------------------
CREATE TABLE users (
    id              INTEGER PRIMARY KEY,
    username        TEXT    NOT NULL UNIQUE,
    password_hash   TEXT    NOT NULL,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -------------------------------------------------------------
-- goals
-- Per-user target (weight or reps) for a given exercise.
-- -------------------------------------------------------------
CREATE TABLE goals (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    exercise_id     INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    target_type     TEXT    NOT NULL CHECK(target_type IN ('weight','reps','distance','pace')),
    target_value    REAL    NOT NULL,
    deadline        TEXT,
    completed_at    TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_goals_user     ON goals(user_id);
CREATE INDEX idx_goals_exercise ON goals(exercise_id);

-- -------------------------------------------------------------
-- Ladder view — generated, not stored
-- Use this query instead of a table:
--
-- SELECT
--     s.date,
--     se.session_id,
--     SUM(st.reps)                                        AS total_reps,
--     MAX(CASE WHEN st.ladder_step = 1 THEN st.reps END) AS step_1,
--     MAX(CASE WHEN st.ladder_step = 2 THEN st.reps END) AS step_2,
--     MAX(CASE WHEN st.ladder_step = 3 THEN st.reps END) AS step_3,
--     MAX(CASE WHEN st.ladder_step = 4 THEN st.reps END) AS step_4,
--     MAX(CASE WHEN st.ladder_step = 5 THEN st.reps END) AS step_5
-- FROM sets st
-- JOIN sessions s ON s.id = st.session_id
-- WHERE st.is_ladder = 1
-- GROUP BY st.session_id;
-- -------------------------------------------------------------