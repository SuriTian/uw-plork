// Ephemeral schema for the production "no real DB budget" deploy — see README.
// Every boot starts clean, so no incremental ALTER TABLE migrations are needed here.
export function createSqliteSchema(raw) {
  raw.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT,
      email       TEXT UNIQUE,
      password    TEXT,
      discipline  TEXT,
      year        TEXT,
      skills      TEXT,
      interests   TEXT,
      terms       TEXT,
      commitment  TEXT,
      github      TEXT,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      poster_id     INTEGER NOT NULL,
      poster_name   TEXT,
      title         TEXT NOT NULL,
      description   TEXT,
      mode          TEXT DEFAULT 'WORK',
      skills_needed TEXT,
      roles         TEXT,
      category      TEXT,
      stage         TEXT,
      terms         TEXT,
      commitment    TEXT,
      spots         INTEGER DEFAULT 1,
      deadline      DATE,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (poster_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS applications (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id       INTEGER NOT NULL,
      applicant_id  INTEGER NOT NULL,
      status        TEXT DEFAULT 'applied',
      applied_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (applicant_id) REFERENCES users(id),
      UNIQUE (post_id, applicant_id)
    );
  `);
}
