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

// Seeds sample users/listings plus one shared login-able "demo" account, so
// the "VIEW DEMO" button on the landing page always has real content to
// browse and can actually post/apply as that shared account — even right
// after a fresh container restart wipes the in-memory DB. See README.
function seedDemoData(raw) {
  const placeholderHash = "$2b$10$ZZQWCMUY/rOdgQxPbu06jOb6F7VsPQnwes98QoU5SRijSiRqNLgku";
  // bcrypt hash of "plork-demo-2026" — the fixed password the frontend's
  // "VIEW DEMO" button logs in with automatically.
  const demoHash = "$2b$10$4ygEfoes/DsXmS3V7Fg0cO5oznQziZft49z91xFdErhH3pHKl6sgO";

  const insertUser = raw.prepare(`
    INSERT INTO users (name, email, password, discipline, year, skills, interests, terms, commitment, github)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const alice = insertUser.run(
    "Alice Chen", "alice.demo@uwaterloo.ca", placeholderHash, "SE", "3A",
    JSON.stringify(["React", "Node.js", "Figma"]), JSON.stringify(["Volleyball"]),
    JSON.stringify(["F26", "W27"]), "SERIOUS", "",
  );
  const ben = insertUser.run(
    "Ben Okafor", "ben.demo@uwaterloo.ca", placeholderHash, "ECE", "2B",
    JSON.stringify(["Embedded C", "PCB Design"]), JSON.stringify(["Chess", "Hiking"]),
    JSON.stringify(["F26", "S27"]), "CASUAL", "",
  );
  const chloe = insertUser.run(
    "Chloe Park", "chloe.demo@uwaterloo.ca", placeholderHash, "MTE", "4A",
    JSON.stringify(["Python", "ML/AI", "Computer Vision"]), JSON.stringify(["Photography", "Running"]),
    JSON.stringify(["F26", "W27", "S27"]), "STARTUP", "",
  );
  insertUser.run(
    "Demo Visitor", "demo@uwaterloo.ca", demoHash, "SE", "3A",
    JSON.stringify(["React", "Python"]), JSON.stringify(["Gaming"]),
    JSON.stringify(["F26", "W27"]), "CASUAL", "",
  );

  const insertPost = raw.prepare(`
    INSERT INTO posts (poster_id, title, description, mode, skills_needed, roles, category, stage, terms, commitment, spots)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPost.run(
    alice.lastInsertRowid, "SOLAR ROVER", "Building a solar-powered rover for the next Waterloo robotics competition.",
    "WORK", JSON.stringify(["Embedded C", "PCB Design"]),
    JSON.stringify([{ title: "Firmware Engineer", skills: ["Embedded C"], filled: false }]),
    "HARDWARE", "PROTOTYPE", JSON.stringify({ founder: ["F26", "W27"], overlap: ["F26"] }), "SERIOUS", 1,
  );
  insertPost.run(
    chloe.lastInsertRowid, "STUDY BUDDY MATCHER", "An ML side project to pair students for study sessions by course and schedule.",
    "WORK", JSON.stringify(["Python", "ML/AI"]),
    JSON.stringify([
      { title: "ML Engineer", skills: ["Python", "ML/AI"], filled: false },
      { title: "Frontend Dev", skills: ["React"], filled: false },
    ]),
    "SOFTWARE", "IDEA", JSON.stringify({ founder: ["F26", "W27", "S27"], overlap: ["F26", "W27"] }), "STARTUP", 2,
  );
  insertPost.run(
    ben.lastInsertRowid, "INTRAMURAL VOLLEYBALL", "Looking for a few more players for Thursday night intramurals.",
    "PLAY", JSON.stringify([]), JSON.stringify([]),
    "SPORT", "RECREATIONAL", JSON.stringify({ founder: ["F26"], overlap: ["F26"] }), "CASUAL", 3,
  );
  insertPost.run(
    chloe.lastInsertRowid, "PHOTOWALK CLUB", "Monthly photo walks around campus and uptown Waterloo, all skill levels.",
    "PLAY", JSON.stringify([]), JSON.stringify([]),
    "SOCIAL", "RECREATIONAL", JSON.stringify({ founder: ["F26", "W27"], overlap: ["F26"] }), "CASUAL", 8,
  );
}
