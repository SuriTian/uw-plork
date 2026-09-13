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

  seedDemoData(raw);
}

// Seeds a couple of users and listings so the read-only demo (see the
// "VIEW DEMO" button on the landing page) always has something to browse,
// even right after a fresh container restart wipes the in-memory DB.
function seedDemoData(raw) {
  const placeholderHash = "$2b$10$ZZQWCMUY/rOdgQxPbu06jOb6F7VsPQnwes98QoU5SRijSiRqNLgku";

  const insertUser = raw.prepare(`
    INSERT INTO users (name, email, password, discipline, year, skills, interests, terms, commitment, github)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const alice = insertUser.run(
    "Alice Chen", "alice.demo@uwaterloo.ca", placeholderHash, "SE", "3A",
    JSON.stringify(["React", "Node.js", "Figma"]), JSON.stringify(["Volleyball"]),
    JSON.stringify(["W26", "S26"]), "SERIOUS", "",
  );
  const ben = insertUser.run(
    "Ben Okafor", "ben.demo@uwaterloo.ca", placeholderHash, "ECE", "2B",
    JSON.stringify(["Embedded C", "PCB Design"]), JSON.stringify(["Chess", "Hiking"]),
    JSON.stringify(["W26", "F26"]), "CASUAL", "",
  );

  const insertPost = raw.prepare(`
    INSERT INTO posts (poster_id, title, description, mode, skills_needed, roles, category, stage, terms, commitment, spots)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPost.run(
    alice.lastInsertRowid, "SOLAR ROVER", "Building a solar-powered rover for the next Waterloo robotics competition.",
    "WORK", JSON.stringify(["Embedded C", "PCB Design"]),
    JSON.stringify([{ title: "Firmware Engineer", skills: ["Embedded C"], filled: false }]),
    "HARDWARE", "PROTOTYPE", JSON.stringify({ founder: ["W26", "S26"], overlap: ["W26"] }), "SERIOUS", 1,
  );
  insertPost.run(
    ben.lastInsertRowid, "INTRAMURAL VOLLEYBALL", "Looking for a few more players for Thursday night intramurals.",
    "PLAY", JSON.stringify([]), JSON.stringify([]),
    "SPORT", "RECREATIONAL", JSON.stringify({ founder: ["W26"], overlap: ["W26"] }), "CASUAL", 3,
  );
}
