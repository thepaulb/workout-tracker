import pandas as pd
import sqlite3
import os
import sys
from datetime import datetime

XLSX_PATH = sys.argv[1] if len(sys.argv) > 1 else "Gym_Restructured_2026_2.xlsx"
DB_PATH   = sys.argv[2] if len(sys.argv) > 2 else "gym.db"

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS exercises (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    category    TEXT    NOT NULL,
    equipment   TEXT    NOT NULL,
    notes       TEXT
);

CREATE TABLE IF NOT EXISTS programmes (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL UNIQUE,
    notes       TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id              INTEGER PRIMARY KEY,
    date            TEXT    NOT NULL,
    programme_id    INTEGER REFERENCES programmes(id) ON DELETE SET NULL,
    notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_date       ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_programme  ON sessions(programme_id);

CREATE TABLE IF NOT EXISTS sets (
    id              INTEGER PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_id     INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    set_number      INTEGER NOT NULL,
    reps            INTEGER,
    weight_kg       REAL,
    weight_note     TEXT,
    duration_min    REAL,
    distance_m      REAL,
    speed_kmh       REAL,
    rest_min        REAL,
    is_ladder       INTEGER NOT NULL DEFAULT 0,
    ladder_step     INTEGER,
    notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_sets_session  ON sets(session_id);
CREATE INDEX IF NOT EXISTS idx_sets_exercise ON sets(exercise_id);

CREATE TABLE IF NOT EXISTS body_composition (
    id              INTEGER PRIMARY KEY,
    date            TEXT    NOT NULL UNIQUE,
    bodyweight_kg   REAL    NOT NULL,
    body_fat_pct    REAL
);

CREATE INDEX IF NOT EXISTS idx_body_composition_date ON body_composition(date);

CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY,
    username        TEXT    NOT NULL UNIQUE,
    password_hash   TEXT    NOT NULL,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goals (
    id           INTEGER PRIMARY KEY,
    exercise_id  INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    target_type  TEXT    NOT NULL CHECK(target_type IN ('weight','reps')),
    target_value REAL    NOT NULL,
    deadline     TEXT,
    completed_at TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_goals_exercise ON goals(exercise_id);
"""

def fmt_date(val):
    if pd.isna(val):
        return None
    if isinstance(val, str):
        return val[:10]
    return pd.Timestamp(val).strftime("%Y-%m-%d")

def nullable(val):
    return None if pd.isna(val) else val

def run():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"Removed existing {DB_PATH}")

    sheets = pd.read_excel(XLSX_PATH, sheet_name=None)
    exercises_df      = sheets["Exercises"]
    sessions_df       = sheets["Sessions"]
    sets_df           = sheets["Sets"]

    print("First few exercise values from Sets sheet:")
    print(sets_df["Exercise"].head(10).tolist())

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.executescript(SCHEMA)
    print("Schema created")

    # ── exercises ────────────────────────────────────────────
    for _, row in exercises_df.iterrows():
        cur.execute(
            "INSERT INTO exercises (id, name, category, equipment, notes) VALUES (?,?,?,?,?)",
            (int(row["ID"]), row["Name"], row["Category"], row["Equipment"], nullable(row["Notes"]))
        )
    print(f"  exercises: {len(exercises_df)} rows")

    # ── programmes (distinct non-null values from Sessions) ──
    programme_names = sessions_df["Programme"].dropna().unique()
    programme_map   = {}
    for name in sorted(programme_names):
        cur.execute("INSERT INTO programmes (name) VALUES (?)", (name,))
        programme_map[name] = cur.lastrowid
    print(f"  programmes: {len(programme_map)} rows")

    # ── sessions ─────────────────────────────────────────────
    for _, row in sessions_df.iterrows():
        prog_id = programme_map.get(row["Programme"]) if pd.notna(row.get("Programme")) else None
        cur.execute(
            "INSERT INTO sessions (id, date, programme_id, notes) VALUES (?,?,?,?)",
            (int(row["ID"]), fmt_date(row["Date"]), prog_id, nullable(row["Notes"]))
        )
    print(f"  sessions:   {len(sessions_df)} rows")

    # ── exercise name → id lookup ─────────────────────────────
    exercise_map = {row["Name"]: int(row["ID"]) for _, row in exercises_df.iterrows()}
    print("Exercise map keys:", sorted(exercise_map.keys()))
    # ── sets ─────────────────────────────────────────────────
    inserted = 0
    for _, row in sets_df.iterrows():

        ex_name = str(row["Exercise"]).strip() if pd.notna(row["Exercise"]) else "NaN_VALUE"
        if ex_name not in exercise_map:
            print(f"NOT IN MAP: {repr(ex_name)}")
            continue

        ex_id = exercise_map[ex_name]

        is_ladder = 1 if pd.notna(row.get("Ladder?")) and str(row["Ladder?"]).strip().lower() == "yes" else 0
        cur.execute(
            """INSERT INTO sets (
                id, session_id, exercise_id, set_number,
                reps, weight_kg, weight_note,
                duration_min, distance_m, speed_kmh, rest_min,
                is_ladder, ladder_step, notes
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                int(row["Set ID"]),
                int(row["Session ID"]),
                ex_id,
                int(row["Set #"]),
                nullable(row["Reps"]),
                nullable(row["Weight (kg)"]),
                nullable(row["Weight Note"]),
                nullable(row["Duration (min)"]),
                nullable(row["Distance (m)"]),
                nullable(row["Speed (km/h)"]),
                nullable(row["Rest (min)"]),
                is_ladder,
                int(row["Ladder Step"]) if pd.notna(row.get("Ladder Step")) else None,
                nullable(row["Notes"]),
            )
        )
        inserted += 1
    print(f"  sets:       {inserted} rows")

    # ── body_composition ─────────────────────────────────────────
    body_df = sheets["Body_Composition"]
    for _, row in body_df.iterrows():
        cur.execute(
            "INSERT OR IGNORE INTO body_composition (date, bodyweight_kg, body_fat_pct) VALUES (?, ?, ?)",
            (
                fmt_date(row["Date"]),
                float(row["Bodyweight (kg)"]),
                float(row["Body Fat (%)"]) if pd.notna(row["Body Fat (%)"]) else None
            )
        )
    print(f"  body_composition: {len(body_df)} rows")

    con.commit()
    con.close()

    # ── verify ───────────────────────────────────────────────
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    print("\nVerification:")
    for table in ["exercises", "programmes", "sessions", "sets", "body_composition", "users", "goals"]:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        print(f"  {table:<20} {cur.fetchone()[0]} rows")

    print("\nSample — last 3 sessions with set counts:")
    cur.execute("""
        SELECT s.id, s.date, p.name, COUNT(st.id) AS set_count
        FROM sessions s
        LEFT JOIN programmes p ON p.id = s.programme_id
        LEFT JOIN sets st ON st.session_id = s.id
        GROUP BY s.id
        ORDER BY s.date DESC
        LIMIT 3
    """)
    for r in cur.fetchall():
        print(f"  {r}")

    con.close()
    print(f"\nDone → {DB_PATH}")

if __name__ == "__main__":
    run()
