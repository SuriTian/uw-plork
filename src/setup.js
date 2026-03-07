import db from "./db.js";

// USERS
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

// Add password column if it doesn't exist (for existing tables)
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

// "post"
await db.execute(`
  CREATE TABLE IF NOT EXISTS posts (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    poster_id     INT NOT NULL,
    poster_name   VARCHAR(255),
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    skills_needed JSON,
    commitment    VARCHAR(20),
    spots         INT DEFAULT 1,
    deadline      DATE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poster_id) REFERENCES users(id)
  )
`);

// application side
await db.execute(`
  CREATE TABLE IF NOT EXISTS applications (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    post_id       INT NOT NULL,
    applicant_id  INT NOT NULL,
    status        ENUM('applied','pending','offer','rejected') DEFAULT 'applied',
    applied_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (applicant_id) REFERENCES users(id)
  )
`);

console.log("Tables created!");
process.exit();
