import db from "./db.js";

await db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255),
    email       VARCHAR(255) UNIQUE,
    password    VARCHAR(255),
    discipline  VARCHAR(50),
    year        VARCHAR(10),
    skills      JSON,
    interests   JSON,
    terms       JSON,
    commitment  VARCHAR(20),
    github      VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

try {
  await db.execute(`
    ALTER TABLE users 
    ADD COLUMN password VARCHAR(255)
  `);
  console.log("Password column added to existing table.");
} catch (error) {
  if (error.code !== "ER_DUP_FIELDNAME") {
    console.error("Error adding password column:", error.message);
  }
}

await db.execute(`
  CREATE TABLE IF NOT EXISTS posts (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    poster_id     INT NOT NULL,
    poster_name   VARCHAR(255),
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    mode          VARCHAR(10) DEFAULT 'WORK',
    skills_needed JSON,
    roles         JSON,
    category      VARCHAR(50),
    stage         VARCHAR(50),
    terms         JSON,
    commitment    VARCHAR(20),
    spots         INT DEFAULT 1,
    deadline      DATE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poster_id) REFERENCES users(id)
  )
`);

// Add columns needed for mode separation / role titles / category / stage / terms to existing tables
for (const [column, definition] of [
  ["mode", "VARCHAR(10) DEFAULT 'WORK'"],
  ["roles", "JSON"],
  ["category", "VARCHAR(50)"],
  ["stage", "VARCHAR(50)"],
  ["terms", "JSON"],
]) {
  try {
    await db.execute(`ALTER TABLE posts ADD COLUMN ${column} ${definition}`);
    console.log(`${column} column added to posts table.`);
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.error(`Error adding ${column} column to posts:`, error.message);
    }
  }
}

await db.execute(`
  CREATE TABLE IF NOT EXISTS applications (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    post_id       INT NOT NULL,
    applicant_id  INT NOT NULL,
    status        ENUM('applied','pending','offer','rejected') DEFAULT 'applied',
    applied_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (applicant_id) REFERENCES users(id),
    UNIQUE KEY unique_application (post_id, applicant_id)
  )
`);

try {
  await db.execute(`
    ALTER TABLE applications
    ADD UNIQUE KEY unique_application (post_id, applicant_id)
  `);
  console.log("Unique constraint added to applications table.");
} catch (error) {
  if (error.code !== "ER_DUP_KEYNAME") {
    console.error("Error adding unique constraint to applications:", error.message);
  }
}

console.log("Tables created!");
process.exit();
