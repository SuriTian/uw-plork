import express from "express";
import db from "./db.js";
import cors from "cors";
import bcrypt from "bcrypt";

const app = express();
app.use(cors());
app.use(express.json());

const parseJsonFields = (obj) => {
  if (!obj) return obj;
  const parsed = { ...obj };
  if (parsed.skills && typeof parsed.skills === "string") {
    try {
      parsed.skills = JSON.parse(parsed.skills);
    } catch {
      parsed.skills = [];
    }
  }
  if (parsed.interests && typeof parsed.interests === "string") {
    try {
      parsed.interests = JSON.parse(parsed.interests);
    } catch {
      parsed.interests = [];
    }
  }
  if (parsed.terms && typeof parsed.terms === "string") {
    try {
      parsed.terms = JSON.parse(parsed.terms);
    } catch {
      parsed.terms = [];
    }
  }
  if (parsed.skills_needed && typeof parsed.skills_needed === "string") {
    try {
      parsed.skills_needed = JSON.parse(parsed.skills_needed);
    } catch {
      parsed.skills_needed = [];
    }
  }
  if (parsed.roles && typeof parsed.roles === "string") {
    try {
      parsed.roles = JSON.parse(parsed.roles);
    } catch {
      parsed.roles = [];
    }
  }
  return parsed;
};

const parseJSON = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
};

function jaccardScore(userSkills, postSkills) {
  const a = new Set(userSkills);
  const b = new Set(postSkills);
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return Math.round((intersection / union) * 100);
}

function calculateCompatibilityScore(
  userSkills,
  userInterests,
  postSkills,
  mode = "WORK",
) {
  if (mode === "WORK") {
    return jaccardScore(userSkills, postSkills);
  } else {
    return jaccardScore(userInterests, postSkills);
  }
}

app.get("/", (req, res) => {
  res.json({ message: "uw-plork API is running!" });
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      userId: user.id,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/users", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      discipline,
      year,
      skills,
      interests,
      terms,
      commitment,
      github,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      `INSERT INTO users (name, email, password, discipline, year, skills, interests, terms, commitment, github)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hashedPassword,
        discipline,
        year,
        JSON.stringify(skills || []),
        JSON.stringify(interests || []),
        JSON.stringify(terms || []),
        commitment,
        github,
      ],
    );
    res.json({ message: "User created!" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Email already exists" });
    }
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const [users] = await db.execute("SELECT * FROM users");
    res.json(users.map(({ password, ...user }) => user));
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/users/:id", async (req, res) => {
  try {
    const [users] = await db.execute("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(parseJsonFields(users[0]));
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.put("/users/:id", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      discipline,
      year,
      skills,
      interests,
      terms,
      built,
      commitment,
      github,
    } = req.body;

    let updateQuery = `UPDATE users SET name = ?, email = ?, discipline = ?, year = ?, skills = ?, interests = ?, terms = ?, commitment = ?, github = ?`;
    let params = [
      name,
      email,
      discipline,
      year,
      JSON.stringify(skills || []),
      JSON.stringify(interests || []),
      JSON.stringify(terms || []),
      commitment,
      github || "",
      req.params.id,
    ];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery = `UPDATE users SET name = ?, email = ?, password = ?, discipline = ?, year = ?, skills = ?, interests = ?, terms = ?, commitment = ?, github = ?`;
      params = [
        name,
        email,
        hashedPassword,
        discipline,
        year,
        JSON.stringify(skills || []),
        JSON.stringify(interests || []),
        JSON.stringify(terms || []),
        commitment,
        github || "",
        req.params.id,
      ];
    }

    updateQuery += ` WHERE id = ?`;
    await db.execute(updateQuery, params);

    const [users] = await db.execute("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(parseJsonFields(users[0]));
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.post("/posts", async (req, res) => {
  try {
    const {
      poster_id,
      title,
      description,
      mode,
      skills_needed,
      roles,
      category,
      stage,
      terms,
      commitment,
      spots,
      deadline,
    } = req.body;

    if (!poster_id || !title) {
      return res
        .status(400)
        .json({ error: "poster_id and title are required" });
    }

    // skills_needed powers the Jaccard compatibility scoring endpoints, so
    // derive it from the structured roles when roles are provided.
    const derivedSkills =
      skills_needed ||
      (roles ? roles.map((r) => r.skills || []).flat() : []);

    const [result] = await db.execute(
      `INSERT INTO posts (poster_id, title, description, mode, skills_needed, roles, category, stage, terms, commitment, spots, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        poster_id,
        title,
        description || "",
        mode === "PLAY" ? "PLAY" : "WORK",
        JSON.stringify(derivedSkills),
        JSON.stringify(roles || []),
        category || null,
        stage || null,
        JSON.stringify(terms || []),
        commitment || null,
        spots || 1,
        deadline || null,
      ],
    );

    const [posts] = await db.execute(
      `SELECT p.*, u.name as poster_name, u.discipline, u.year
      FROM posts p
      JOIN users u ON p.poster_id = u.id
      WHERE p.id = ?`,
      [result.insertId],
    );

    const post = posts[0] || {
      id: result.insertId,
      title: title,
      description: description,
    };
    res.json(parseJsonFields(post));
  } catch (error) {
    console.error("Error creating post:", error);
    res
      .status(500)
      .json({ error: "Failed to create post", details: error.message });
  }
});

app.get("/posts", async (req, res) => {
  try {
    const userId = req.query.userId;
    const mode = req.query.mode || "WORK";

    let userSkills = [];
    let userInterests = [];
    if (userId) {
      try {
        const [users] = await db.execute("SELECT * FROM users WHERE id = ?", [
          userId,
        ]);
        if (users.length > 0) {
          const user = parseJsonFields(users[0]);
          userSkills = parseJSON(user.skills || []);
          userInterests = parseJSON(user.interests || []);
        }
      } catch (err) {
        console.error("Error fetching user for compatibility:", err);
      }
    }

    const [posts] = await db.execute(
      `SELECT p.*, u.name as poster_name, u.discipline, u.year
      FROM posts p
      JOIN users u ON p.poster_id = u.id
      WHERE p.mode = ?
      ORDER BY p.created_at DESC`,
      [mode],
    );

    const postsWithOwnership = posts.map((post) => {
      const parsed = parseJsonFields(post);
      const isYours = userId ? post.poster_id === parseInt(userId) : false;

      let compatibilityScore = null;
      if (userId && !isYours) {
        const postSkills = parseJSON(parsed.skills_needed || []);
        if (mode === "WORK" && userSkills.length > 0) {
          compatibilityScore = calculateCompatibilityScore(
            userSkills,
            userInterests,
            postSkills,
            "WORK",
          );
        } else if (mode === "PLAY" && userInterests.length > 0) {
          compatibilityScore = calculateCompatibilityScore(
            userSkills,
            userInterests,
            postSkills,
            "PLAY",
          );
        }
      }

      return {
        ...parsed,
        yours: isYours,
        compatibility_score: compatibilityScore,
      };
    });

    res.json(postsWithOwnership);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.get("/posts/:id", async (req, res) => {
  try {
    const userId = req.query.userId;
    const mode = req.query.mode || "WORK";

    let userSkills = [];
    let userInterests = [];
    if (userId) {
      try {
        const [users] = await db.execute("SELECT * FROM users WHERE id = ?", [
          userId,
        ]);
        if (users.length > 0) {
          const user = parseJsonFields(users[0]);
          userSkills = parseJSON(user.skills || []);
          userInterests = parseJSON(user.interests || []);
        }
      } catch (err) {
        console.error("Error fetching user for compatibility:", err);
      }
    }

    const [posts] = await db.execute(
      `SELECT p.*, u.name as poster_name, u.discipline, u.year
      FROM posts p JOIN users u ON p.poster_id = u.id
      WHERE p.id = ?`,
      [req.params.id],
    );
    if (posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    const post = parseJsonFields(posts[0]);
    const isYours = userId ? posts[0].poster_id === parseInt(userId) : false;

    let compatibilityScore = null;
    if (userId && !isYours) {
      const postSkills = parseJSON(post.skills_needed || []);
      if (mode === "WORK" && userSkills.length > 0) {
        compatibilityScore = calculateCompatibilityScore(
          userSkills,
          userInterests,
          postSkills,
          "WORK",
        );
      } else if (mode === "PLAY" && userInterests.length > 0) {
        compatibilityScore = calculateCompatibilityScore(
          userSkills,
          userInterests,
          postSkills,
          "PLAY",
        );
      }
    }

    post.yours = isYours;
    post.compatibility_score = compatibilityScore;
    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

app.post("/applications", async (req, res) => {
  try {
    const { post_id, applicant_id } = req.body;

    if (!post_id || !applicant_id) {
      return res
        .status(400)
        .json({ error: "post_id and applicant_id are required" });
    }

    await db.execute(
      `INSERT INTO applications (post_id, applicant_id) VALUES (?, ?)`,
      [post_id, applicant_id],
    );
    res.json({ message: "Request sent!" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "You already applied to this post" });
    }
    console.error("Error creating application:", error);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

app.get("/applications/:post_id", async (req, res) => {
  try {
    const mode = req.query.mode || "WORK"; // WORK or PLAY mode
    
    // Get the post to determine required skills
    const [posts] = await db.execute("SELECT * FROM posts WHERE id = ?", [
      req.params.post_id,
    ]);
    if (!posts.length) {
      return res.status(404).json({ error: "Post not found" });
    }

    const [applications] = await db.execute(
      `
      SELECT r.*, u.name, u.discipline, u.year, u.skills, u.interests, u.github
      FROM applications r
      JOIN users u ON r.applicant_id = u.id
      WHERE r.post_id = ?
    `,
      [req.params.post_id],
    );

    const post = parseJsonFields(posts[0]);
    const postSkills = parseJSON(post.skills_needed || []);

    // Calculate compatibility score for each applicant based on mode
    const applicantsWithScores = applications.map((application) => {
      const applicantData = parseJsonFields(application);
      const applicantSkills = parseJSON(applicantData.skills || []);
      const applicantInterests = parseJSON(applicantData.interests || []);
      
      const compatibilityScore = calculateCompatibilityScore(
        applicantSkills,
        applicantInterests,
        postSkills,
        mode
      );
      
      return { ...applicantData, compatibility_score: compatibilityScore };
    });

    // Sort by compatibility score (descending)
    applicantsWithScores.sort((a, b) => b.compatibility_score - a.compatibility_score);

    res.json(applicantsWithScores);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

app.get("/applications/:post_id/ranked", async (req, res) => {
  try {
    const mode = req.query.mode || "WORK"; // WORK or PLAY mode
    
    const [posts] = await db.execute("SELECT * FROM posts WHERE id = ?", [
      req.params.post_id,
    ]);
    if (!posts.length) {
      return res.status(404).json({ error: "Post not found" });
    }

    const [applications] = await db.execute(
      `
      SELECT r.*, u.name, u.discipline, u.year, u.skills, u.interests, u.github
      FROM applications r
      JOIN users u ON r.applicant_id = u.id
      WHERE r.post_id = ?
    `,
      [req.params.post_id],
    );

    const post = parseJsonFields(posts[0]);
    const postSkills = parseJSON(post.skills_needed || []);

    const ranked = applications
      .map((applicant) => {
        const applicantData = parseJsonFields(applicant);
        const applicantSkills = parseJSON(applicantData.skills || []);
        const applicantInterests = parseJSON(applicantData.interests || []);
        const compatibilityScore = calculateCompatibilityScore(
          applicantSkills,
          applicantInterests,
          postSkills,
          mode
        );
        return { ...applicantData, fit_score: compatibilityScore, compatibility_score: compatibilityScore };
      })
      .sort((a, b) => b.fit_score - a.fit_score);

    res.json({ post: post.title, applicants: ranked });
  } catch (error) {
    console.error("Error ranking applicants:", error);
    res.status(500).json({ error: "Failed to rank applicants" });
  }
});

app.get("/applications/user/:user_id", async (req, res) => {
  try {
    const [applications] = await db.execute(
      `
      SELECT r.*, p.title as post_title, p.description as post_description
      FROM applications r
      JOIN posts p ON r.post_id = p.id
      WHERE r.applicant_id = ?
    `,
      [req.params.user_id],
    );
    res.json(applications);
  } catch (error) {
    console.error("Error fetching user applications:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// Get top matching users for a post (users who haven't applied yet)
app.get("/posts/:post_id/top-matches", async (req, res) => {
  try {
    const mode = req.query.mode || "WORK"; // WORK or PLAY mode
    const limit = parseInt(req.query.limit) || 20; // Number of top matches to return
    
    // Get the post
    const [posts] = await db.execute("SELECT * FROM posts WHERE id = ?", [
      req.params.post_id,
    ]);
    if (!posts.length) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = parseJsonFields(posts[0]);
    const postSkills = parseJSON(post.skills_needed || []);
    const posterId = post.poster_id;

    // Get existing applicants to exclude them
    const [existingApplications] = await db.execute(
      "SELECT applicant_id FROM applications WHERE post_id = ?",
      [req.params.post_id]
    );
    const applicantIds = existingApplications.map(app => app.applicant_id);
    
    // Build query to exclude poster and existing applicants
    let excludeIds = [posterId, ...applicantIds];
    const placeholders = excludeIds.map(() => "?").join(",");
    
    // Get all users except the poster and existing applicants
    const [users] = await db.execute(
      `SELECT * FROM users WHERE id NOT IN (${placeholders})`,
      excludeIds
    );

    // Calculate compatibility score for each user
    const usersWithScores = users.map((user) => {
      const userData = parseJsonFields(user);
      const userSkills = parseJSON(userData.skills || []);
      const userInterests = parseJSON(userData.interests || []);
      
      const compatibilityScore = calculateCompatibilityScore(
        userSkills,
        userInterests,
        postSkills,
        mode
      );
      
      return { ...userData, compatibility_score: compatibilityScore };
    });

    // Sort by compatibility score (descending) and take top N
    usersWithScores.sort((a, b) => b.compatibility_score - a.compatibility_score);
    const topMatches = usersWithScores.slice(0, limit);

    res.json({ post: post.title, matches: topMatches });
  } catch (error) {
    console.error("Error fetching top matches:", error);
    res.status(500).json({ error: "Failed to fetch top matches" });
  }
});

app.patch("/applications/:id", async (req, res) => {
  try {
    const { status } = req.body;
    await db.execute("UPDATE applications SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    res.json({ message: `Request ${status}!` });
  } catch (error) {
    console.error("Error updating application:", error);
    res.status(500).json({ error: "Failed to update application" });
  }
});

app.get("/feed/:user_id", async (req, res) => {
  try {
    const mode = req.query.mode || "WORK";

    const [users] = await db.execute("SELECT * FROM users WHERE id = ?", [
      req.params.user_id,
    ]);
    if (!users.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = parseJsonFields(users[0]);
    const userSkills = parseJSON(user.skills || []);
    const userInterests = parseJSON(user.interests || []);

    const [posts] = await db.execute(
      `
      SELECT p.*, u.name as poster_name, u.discipline, u.year
      FROM posts p
      JOIN users u ON p.poster_id = u.id
      WHERE p.poster_id != ?
      ORDER BY p.created_at DESC
    `,
      [req.params.user_id],
    );

    const scored = posts.map((post) => {
      const parsed = parseJsonFields(post);
      const postSkills = parseJSON(parsed.skills_needed || []);
      const finalScore = calculateCompatibilityScore(
        userSkills,
        userInterests,
        postSkills,
        mode,
      );
      return { ...parsed, compatibility_score: finalScore };
    });

    scored.sort((a, b) => b.compatibility_score - a.compatibility_score);

    res.json({ user: user.name, listings: scored });
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
