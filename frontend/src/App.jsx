import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// API LAYER
// Connected to backend API at http://localhost:3000
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:3000";

// Helper function to parse JSON fields from database
const parseJsonFields = (obj) => {
  if (!obj) return obj;
  const parsed = { ...obj };
  if (parsed.skills && typeof parsed.skills === 'string') {
    try { parsed.skills = JSON.parse(parsed.skills); } catch { parsed.skills = []; }
  }
  if (parsed.interests && typeof parsed.interests === 'string') {
    try { parsed.interests = JSON.parse(parsed.interests); } catch { parsed.interests = []; }
  }
  if (parsed.skills_needed && typeof parsed.skills_needed === 'string') {
    try { parsed.skills_needed = JSON.parse(parsed.skills_needed); } catch { parsed.skills_needed = []; }
  }
  return parsed;
};

const api = {
  // ── AUTH ──────────────────────────────────────────────────────────────────
  // For now, using simple user creation. In production, add proper auth endpoints
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Login failed" }));
        throw new Error(errorData.error || "Invalid email or password");
      }
      const data = await response.json();
      return { token: "mock-jwt", userId: data.userId, user: data.user };
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  },

  register: async (formData) => {
    try {
      if (!formData.password) {
        throw new Error("Password is required");
      }
      const response = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          discipline: formData.discipline,
          year: formData.year,
          skills: formData.skills || [],
          interests: formData.interests || [],
          commitment: formData.commitment,
          github: formData.github || "",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Registration failed" }));
        throw new Error(errorData.error || "Registration failed");
      }
      await response.json();
      // Get the created user to return ID
      const usersRes = await fetch(`${API_BASE}/users`);
      if (!usersRes.ok) throw new Error("Failed to fetch created user");
      const users = await usersRes.json();
      const user = users.find(u => u.email === formData.email);
      if (!user) throw new Error("User not found after creation");
      return { token: "mock-jwt", userId: user.id, ...parseJsonFields(user) };
    } catch (error) {
      console.error("Error registering:", error);
      // Provide more helpful error message for network errors
      if (error.message.includes("Failed to fetch") || error.name === "TypeError") {
        throw new Error("Cannot connect to server. Make sure the backend is running on http://localhost:3000");
      }
      throw error;
    }
  },

  logout: () => Promise.resolve({ ok: true }),

  // ── PROFILE ───────────────────────────────────────────────────────────────
  getProfile: async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}`);
      if (!response.ok) {
        // Fallback to getting all users if specific user not found
        const usersRes = await fetch(`${API_BASE}/users`);
        if (!usersRes.ok) throw new Error("Failed to fetch users");
        const users = await usersRes.json();
        const user = users.find(u => u.id === Number(userId)) || users[0];
        return parseJsonFields(user);
      }
      const user = await response.json();
      return parseJsonFields(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  },

  updateProfile: async (userId, data) => {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          discipline: data.discipline,
          year: data.year,
          skills: data.skills || [],
          interests: data.interests || [],
          commitment: data.commitment,
          github: data.github || "",
        }),
      });
      if (!response.ok) throw new Error("Update failed");
      const updated = await response.json();
      return parseJsonFields(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  },

  // ── PROJECTS / ACTIVITIES ─────────────────────────────────────────────────
  getProjects: async (mode, userId = null) => {
    try {
      const url = userId ? `${API_BASE}/posts?userId=${userId}` : `${API_BASE}/posts`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch posts");
      const posts = await response.json();
      // Transform posts to match frontend format
      return posts.map(post => {
        const parsed = parseJsonFields(post);
        return {
          id: parsed.id,
          name: parsed.title,
          tagline: parsed.description || "",
          category: "SOFTWARE", // Default, could be stored in DB
          stage: "IDEA", // Default
          match: Math.floor(Math.random() * 20) + 70, // Calculate based on skills
          commitment: parsed.commitment || "SERIOUS",
          roles: parsed.skills_needed ? parsed.skills_needed.map((skill, idx) => ({
            title: `Role ${idx + 1}`,
            skills: Array.isArray(skill) ? skill : [skill],
            filled: false,
          })) : [],
          spots: parsed.spots || 1,
          terms: { founder: [], overlap: [] }, // TODO: Store terms in DB
          yours: parsed.yours || false, // Set by backend based on userId
          poster_name: parsed.poster_name,
          discipline: parsed.discipline,
          year: parsed.year,
        };
      });
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
  },

  createProject: async (data, userId) => {
    try {
      if (!userId) throw new Error("User ID required");
      const response = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poster_id: userId,
          title: data.name,
          description: data.tagline,
          skills_needed: data.roles ? data.roles.map(r => r.skills).flat() : [],
          commitment: data.commitment,
          spots: data.spots || 1,
          deadline: null,
        }),
      });
      if (!response.ok) throw new Error("Failed to create post");
      await response.json();
      // Fetch the created post to get its ID
      const postsRes = await fetch(`${API_BASE}/posts`);
      if (postsRes.ok) {
        const posts = await postsRes.json();
        const created = posts[0]; // Most recent post
        return { ...data, id: created.id };
      }
      return { ...data, id: Date.now() };
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  },

  updateProject: async (id, data) => {
    // TODO: Add PUT /posts/:id endpoint
    return { id, ...data };
  },

  deleteProject: async (id) => {
    // TODO: Add DELETE /posts/:id endpoint
    return { ok: true };
  },

  // ── OUTBOUND APPLICATIONS (user applied to someone else) ──────────────────
  getMyApplications: async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/applications/user/${userId}`);
      if (!response.ok) {
        // Fallback: Get all posts and check applications
        const postsRes = await fetch(`${API_BASE}/posts`);
        if (!postsRes.ok) throw new Error("Failed to fetch posts");
        const posts = await postsRes.json();
        const applications = [];

        for (const post of posts) {
          const appRes = await fetch(`${API_BASE}/applications/${post.id}`);
          if (appRes.ok) {
            const apps = await appRes.json();
            const userApp = apps.find(a => a.applicant_id === Number(userId));
            if (userApp) {
              const parsed = parseJsonFields(userApp);
              applications.push({
                id: parsed.id,
                projectId: post.id,
                projectName: post.title || post.post_title,
                projectCategory: "SOFTWARE",
                roleTitle: "Role",
                roleSkills: [],
                intro: "",
                links: parsed.github || "",
                status: parsed.status || "PENDING",
                createdAt: parsed.applied_at || new Date().toISOString(),
                updatedAt: parsed.applied_at || new Date().toISOString(),
              });
            }
          }
        }
        return applications;
      }
      const applications = await response.json();
      return applications.map(app => {
        const parsed = parseJsonFields(app);
        return {
          id: parsed.id,
          projectId: parsed.post_id,
          projectName: parsed.post_title || "",
          projectCategory: "SOFTWARE",
          roleTitle: "Role",
          roleSkills: [],
          intro: "",
          links: "",
          status: parsed.status || "PENDING",
          createdAt: parsed.applied_at || new Date().toISOString(),
          updatedAt: parsed.applied_at || new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error("Error fetching applications:", error);
      return [];
    }
  },

  submitApplication: async (data, userId) => {
    try {
      if (!userId) throw new Error("User ID required");
      const response = await fetch(`${API_BASE}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: data.projectId,
          applicant_id: userId,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit application");
      await response.json();
      return {
        id: `app_${Date.now()}`,
        ...data,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error submitting application:", error);
      throw error;
    }
  },

  // ── INBOUND APPLICATIONS (founder reviewing applicants) ───────────────────
  getProjectApplicants: async (postId) => {
    try {
      const response = await fetch(`${API_BASE}/applications/${postId}`);
      if (!response.ok) throw new Error("Failed to fetch applicants");
      const applications = await response.json();
      return applications.map(app => {
        const parsed = parseJsonFields(app);
        return {
          id: parsed.id,
          applicantName: parsed.name,
          applicantStream: `${parsed.discipline} ${parsed.year}`,
          applicantSkills: parsed.skills || [],
          applicantTerms: [], // TODO: Store terms in user profile
          applicantMatch: Math.floor(Math.random() * 20) + 70,
          roleTitle: "Role", // TODO: Store in application
          intro: "",
          links: parsed.github || "",
          status: parsed.status || "PENDING",
          createdAt: parsed.applied_at || new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error("Error fetching applicants:", error);
      return [];
    }
  },

  updateApplicationStatus: async (id, status) => {
    try {
      const response = await fetch(`${API_BASE}/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update application");
      return { status };
    } catch (error) {
      console.error("Error updating application status:", error);
      throw error;
    }
  },

  // ── MATCHING ──────────────────────────────────────────────────────────────
  getCompatibleUsers: async (postId) => {
    try {
      // Get all users and calculate compatibility
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) throw new Error("Failed to fetch users");
      const users = await response.json();
      return users.slice(0, 3).map(u => {
        const parsed = parseJsonFields(u);
        return {
          id: parsed.id,
          name: parsed.name,
          stream: `${parsed.discipline} ${parsed.year}`,
          match: Math.floor(Math.random() * 20) + 70,
          skills: parsed.skills || [],
          terms: [], // TODO: Store terms in user profile
        };
      });
    } catch (error) {
      console.error("Error fetching compatible users:", error);
      return [];
    }
  },

  // ── INVITES ───────────────────────────────────────────────────────────────
  sendInvite: async (toUserId, projectId, roleTitle) => {
    try {
      // For now, create an application as an invite
      const response = await fetch(`${API_BASE}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: projectId,
          applicant_id: toUserId,
        }),
      });
      if (!response.ok) throw new Error("Failed to send invite");
      return { ok: true };
    } catch (error) {
      console.error("Error sending invite:", error);
      throw error;
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────
const INIT_PROJECTS = [
  {
    id: 1, name: "SOLARIS", tagline: "Solar-powered autonomous campus weather network", category: "HARDWARE", stage: "POC", match: 94, commitment: "SERIOUS",
    roles: [{ title: "Firmware Engineer", skills: ["Embedded C", "FPGA"], filled: true, member: "A. Singh" },
    { title: "ML Engineer", skills: ["Python", "ML/AI"], filled: true, member: "P. Mehta" },
    { title: "PCB Designer", skills: ["PCB Design", "KiCad"], filled: false },
    { title: "Backend Developer", skills: ["Node.js", "Python"], filled: false }],
    terms: { founder: ["W25", "F25", "W26"], overlap: ["W25", "F25", "W26"] }, yours: false
  },
  {
    id: 2, name: "NEXUS AR", tagline: "AR overlay for E5/E7 lab equipment manuals", category: "SOFTWARE", stage: "IDEA", match: 78, commitment: "CASUAL",
    roles: [{ title: "iOS Developer", skills: ["iOS", "Swift"], filled: true, member: "D. Wang" },
    { title: "3D Designer", skills: ["CAD", "Blender"], filled: false },
    { title: "CV Engineer", skills: ["Computer Vision", "Python"], filled: false }],
    terms: { founder: ["S25", "F25"], overlap: ["F25"] }, yours: false
  },
  {
    id: 3, name: "WATERVAULT", tagline: "Encrypted academic resource sharing for UW", category: "SOFTWARE", stage: "PROTOTYPE", match: 88, commitment: "STARTUP",
    roles: [{ title: "Security Engineer", skills: ["Rust", "Crypto"], filled: true, member: "K. Liu" },
    { title: "Frontend Developer", skills: ["React", "TypeScript"], filled: false },
    { title: "DevOps Engineer", skills: ["Docker", "Node.js"], filled: false }],
    terms: { founder: ["W25", "S25", "F25", "W26"], overlap: ["W25", "F25", "W26"] }, yours: false
  },
];
const INIT_ACTIVITIES = [
  { id: 4, name: "BADMINTON", tagline: "Competitive doubles — looking for consistent partners", category: "SPORT", type: "COMPETITIVE", match: 91, spots: 2, terms: { overlap: ["W25", "F25", "W26"] }, tags: ["Doubles", "PAC", "Competitive"], yours: false },
  { id: 5, name: "JAZZ BAND", tagline: "Small ensemble, plays CIF events and campus shows", category: "MUSIC", type: "RECREATIONAL", match: 65, spots: 3, terms: { overlap: ["S25", "F25"] }, tags: ["Jazz", "Brass", "Casual"], yours: false },
];
const INIT_PROFILE = {
  name: "Jamie Kim", email: "jkim@uwaterloo.ca", discipline: "ECE", year: "3A",
  skills: ["React", "TypeScript", "ML/AI", "Python"], interests: ["Badminton", "Chess", "Music"],
  built: "Built a lane-detection model for Midnight Sun. Shipped a React dashboard for 500 users.",
  terms: ["W25", "F25", "W26"], commitment: "SERIOUS", github: "github.com/jkim",
};
const MOCK_APPLICATIONS = [
  {
    id: "app_001", projectId: 1, projectName: "SOLARIS", projectCategory: "HARDWARE", roleTitle: "Backend Developer", roleSkills: ["Node.js", "Python"],
    intro: "I'm a 3A ECE student with strong Node.js and Python experience. I've shipped 3 backend services in production and can commit 10hrs/week.",
    links: "github.com/jkim", status: "PENDING", createdAt: "2026-02-14T10:30:00Z", updatedAt: "2026-02-14T10:30:00Z"
  },
  {
    id: "app_002", projectId: 2, projectName: "NEXUS AR", projectCategory: "SOFTWARE", roleTitle: "CV Engineer", roleSkills: ["Computer Vision", "Python"],
    intro: "Built a real-time object detection pipeline last term. Would love to apply CV skills to AR hardware.",
    links: "github.com/jkim/cv-lab", status: "ACCEPTED", createdAt: "2026-01-28T14:00:00Z", updatedAt: "2026-02-01T09:15:00Z"
  },
  {
    id: "app_003", projectId: 3, projectName: "WATERVAULT", projectCategory: "SOFTWARE", roleTitle: "Frontend Developer", roleSkills: ["React", "TypeScript"],
    intro: "Strong React + TypeScript background. Looking for a security-focused project to round out my portfolio.",
    links: "", status: "REJECTED", createdAt: "2026-01-20T11:00:00Z", updatedAt: "2026-01-25T16:00:00Z"
  },
];
// MOCK_INCOMING removed - no longer used (replaced by API calls)

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const ALL_TERMS = ["W24", "S24", "F24", "W25", "S25", "F25", "W26"];
const YOU_TERMS = ["W25", "F25", "W26"];
const SKILL_OPTIONS = ["React", "TypeScript", "Python", "ML/AI", "Embedded C", "PCB Design", "CAD", "Rust", "Node.js", "FPGA", "Computer Vision", "iOS", "Java", "C++", "Figma", "Verilog", "Swift", "Docker"];
const DISCIPLINE_OPTIONS = ["ECE", "MTE", "SE", "CE", "ME", "CHE", "CIVE", "ENVE", "NANO", "SYDE", "TRON", "BME"];
const YEAR_OPTIONS = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];
const INTEREST_OPTIONS = ["Volleyball", "Badminton", "Basketball", "Soccer", "Chess", "Hiking", "Music", "Gaming", "Photography", "Cooking", "Running", "Tennis"];
const CATEGORIES_BUILD = ["SOFTWARE", "HARDWARE", "RESEARCH", "STARTUP", "DESIGN"];
const CATEGORIES_CREW = ["SPORT", "MUSIC", "GAMING", "ART", "SOCIAL", "FOOD"];
const STAGES = ["IDEA", "POC", "PROTOTYPE", "SCALING"];
const COMMITMENTS = ["CASUAL", "SERIOUS", "STARTUP"];
const ACTIVITY_TYPES = ["RECREATIONAL", "COMPETITIVE", "ONE-TIME"];
const C = {
  bg: "#F5F2EB", surface: "#EDEAE1", surface2: "#E5E1D6", detail: "#EFECE3",
  ink: "#15150D", body: "#3a3a28", muted: "#7a7a62", rule: "#D8D4C6",
  lime: "#AACC00", limeLight: "#F0F9C0", limeDark: "#8aaa00", limeInk: "#2d3a00",
  red: "#CC3300", redLight: "#FFF0ED",
  amber: "#CC8800", amberLight: "#FFF8E0",
};
const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Bebas+Neue&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { background:${C.bg}; }
  ::selection { background:${C.lime}; color:${C.limeInk}; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-thumb { background:${C.rule}; }
  input, textarea, button, select { font-family:'IBM Plex Mono',monospace; }
  input::placeholder, textarea::placeholder { color:${C.muted}; }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
  .fade-up  { animation:fadeUp  0.3s  both; }
  .slide-in { animation:slideIn 0.25s both; }
  @media(max-width:860px){
    .app-layout { flex-direction:column !important; }
    .app-sidebar { width:100% !important; max-height:220px !important; border-right:none !important; border-bottom:1px solid ${C.rule} !important; }
  }
  @media(max-width:540px){ .topbar-meta { display:none !important; } }
`;

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────
const D = ({ children, size = 48, color = C.ink, style = {} }) => (
  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: size, letterSpacing: "0.08em", lineHeight: 1, color, ...style }}>{children}</span>
);
const M = ({ children, style = {} }) => (
  <span style={{ fontFamily: "'IBM Plex Mono',monospace", ...style }}>{children}</span>
);

function StatusBadge({ status }) {
  const cfg = {
    PENDING: { bg: C.amberLight, color: C.amber, border: "#cc880044" },
    ACCEPTED: { bg: C.limeLight, color: C.limeDark, border: `${C.lime}66` },
    REJECTED: { bg: C.redLight, color: C.red, border: "#cc330044" },
  }[status] || { bg: C.amberLight, color: C.amber, border: "#cc880044" };
  return <M style={{ fontSize: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: "3px 10px", letterSpacing: "0.08em", flexShrink: 0 }}>{status}</M>;
}

function Chip({ children, active, onClick, small }) {
  return <span onClick={onClick} style={{ display: "inline-block", fontFamily: "'IBM Plex Mono',monospace", fontSize: small ? 10 : 11, letterSpacing: "0.04em", padding: small ? "3px 8px" : "5px 12px", border: active ? `1.5px solid ${C.ink}` : `1px solid ${C.rule}`, background: active ? C.ink : "transparent", color: active ? C.bg : C.body, cursor: onClick ? "pointer" : "default", transition: "all 0.1s", userSelect: "none" }}>{children}</span>;
}
function FieldInput({ label, value, onChange, placeholder, type = "text", hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em" }}>{label}</label>
        {hint && <M style={{ fontSize: 10, color: C.muted }}>{hint}</M>}
      </div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "11px 14px", fontSize: 13, color: C.ink, background: C.surface, border: `1px solid ${C.rule}`, outline: "none", transition: "border-color 0.15s" }}
        onFocus={e => e.target.style.borderColor = C.lime} onBlur={e => e.target.style.borderColor = C.rule} />
    </div>
  );
}
function FieldTextarea({ label, value, onChange, placeholder, rows = 3, hint }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em" }}>{label}</label>
        {hint && <M style={{ fontSize: 10, color: C.muted }}>{hint}</M>}
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ width: "100%", padding: "11px 14px", fontSize: 13, color: C.ink, background: C.surface, border: `1px solid ${C.rule}`, outline: "none", resize: "vertical", lineHeight: 1.6, transition: "border-color 0.15s" }}
        onFocus={e => e.target.style.borderColor = C.lime} onBlur={e => e.target.style.borderColor = C.rule} />
    </div>
  );
}
function SectionLabel({ children }) {
  return <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", display: "block", marginBottom: 12 }}>{children}</M>;
}
function SectionDivider() { return <div style={{ height: 1, background: C.rule, margin: "28px 0" }} />; }

// Shared top bar for sub-pages
function SubTopBar({ onBack, backLabel = "BACK TO PLORK", rightSlot }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", borderBottom: `1px solid ${C.rule}`, height: 52, flexShrink: 0, background: C.bg }}>
      <div style={{ padding: "0 24px", display: "flex", alignItems: "center", borderRight: `1px solid ${C.rule}`, gap: 10 }}>
        <D size={24}>PLORK</D>
        <div style={{ width: 5, height: 5, background: C.lime, animation: "blink 1.4s infinite" }} />
      </div>
      <button onClick={onBack} style={{ padding: "0 22px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, letterSpacing: "0.08em", color: C.muted, background: "transparent", border: "none", borderRight: `1px solid ${C.rule}` }}>
        ← {backLabel}
      </button>
      {rightSlot && <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", borderLeft: `1px solid ${C.rule}` }}>{rightSlot}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDING
// ─────────────────────────────────────────────────────────────────────────────
function Landing({ onLogin, onSignup }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace", color: C.ink }}>
      <style>{BASE_CSS}</style>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 56, borderBottom: `1px solid ${C.rule}` }}>
        <D size={26}>PLORK</D>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onLogin} style={{ fontSize: 11, letterSpacing: "0.08em", padding: "8px 20px", border: `1px solid ${C.rule}`, background: "transparent", color: C.body, cursor: "pointer" }}>LOG IN</button>
          <button onClick={onSignup} style={{ fontSize: 11, letterSpacing: "0.08em", padding: "8px 20px", border: "none", background: C.ink, color: C.bg, cursor: "pointer", fontWeight: 600 }}>SIGN UP →</button>
        </div>
      </nav>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 56px)" }}>
        <div style={{ padding: "72px 56px 56px", borderRight: `1px solid ${C.rule}`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <M style={{ fontSize: 11, color: C.muted, letterSpacing: "0.16em", display: "block", marginBottom: 20 }}>FOR WORK AND PLAY</M>
            <div style={{ marginBottom: 32 }}>
              <D size={76} style={{ display: "block", marginBottom: 2 }}>FIND YOUR</D>
              <D size={76} style={{ display: "block", marginBottom: 2 }}>TEAM AT</D>
              <span style={{ display: "inline-block", background: C.ink, padding: "2px 14px" }}><D size={76} color={C.lime}>WATERLOO</D></span>
            </div>
            <p style={{ fontSize: 14, color: C.body, lineHeight: 1.8, maxWidth: 420, marginBottom: 40 }}>The co-op cycle kills side projects and sports teams alike. Plork matches you by skill, schedule, and the terms you're actually on campus.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onSignup} style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, padding: "13px 32px", border: "none", background: C.lime, color: C.limeInk, cursor: "pointer" }}>GET STARTED →</button>
              <button onClick={onLogin} style={{ fontSize: 12, letterSpacing: "0.1em", padding: "13px 32px", border: `1px solid ${C.rule}`, background: "transparent", color: C.body, cursor: "pointer" }}>LOG IN</button>
            </div>
          </div>
          <div style={{ display: "flex", paddingTop: 32, borderTop: `1px solid ${C.rule}`, marginTop: 56 }}>
            {[["10K+", "ENG STUDENTS"], ["4", "CO-OP ROTATIONS/YR"], ["8", "DISCIPLINES"]].map(([n, l], i) => (
              <div key={l} style={{ flex: 1, paddingRight: i < 2 ? 24 : 0, borderRight: i < 2 ? `1px solid ${C.rule}` : "none", marginRight: i < 2 ? 24 : 0 }}>
                <D size={32} style={{ display: "block" }}>{n}</D>
                <M style={{ fontSize: 9, color: C.muted, letterSpacing: "0.1em" }}>{l}</M>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ borderBottom: `1px solid ${C.rule}`, padding: "48px 48px 36px" }}>
            <SectionLabel>TWO MODES</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {[{ m: "BUILD", desc: "Side projects & engineering teams. Role slots and skill matching.", dark: true },
              { m: "CREW", desc: "Sports, music, social. Find people on campus the same terms as you.", dark: false }].map((x, i) => (
                <div key={x.m} style={{ padding: "20px 22px", background: x.dark ? C.ink : C.surface, borderRight: i === 0 ? `1px solid ${C.rule}` : "none" }}>
                  <D size={22} color={x.dark ? C.lime : C.muted} style={{ display: "block", marginBottom: 10 }}>{x.m}</D>
                  <p style={{ fontSize: 12, color: x.dark ? "#7a9a6a" : C.muted, lineHeight: 1.65 }}>{x.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderBottom: `1px solid ${C.rule}`, padding: "32px 48px" }}>
            <SectionLabel>CO-OP OVERLAP CALENDAR</SectionLabel>
            {[{ n: "YOU", t: ["W25", "F25", "W26"] }, { n: "ARJUN", t: ["W25", "S25", "F25", "W26"] }, { n: "PRIYA", t: ["F25", "W26"] }].map(p => (
              <div key={p.n} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <M style={{ width: 52, fontSize: 10, color: C.muted }}>{p.n}</M>
                <div style={{ display: "flex", gap: 5 }}>{ALL_TERMS.slice(3).map(t => { const a = p.t.includes(t), ov = a && YOU_TERMS.includes(t); return <div key={t} style={{ width: 30, height: 14, background: ov ? C.lime : a ? C.ink : C.rule }} />; })}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 5, marginTop: 6, paddingLeft: 66 }}>{ALL_TERMS.slice(3).map(t => <M key={t} style={{ width: 30, fontSize: 8, color: C.muted, textAlign: "center" }}>{t}</M>)}</div>
          </div>
          <div style={{ padding: "32px 48px" }}>
            <SectionLabel>ROLE SLOT SYSTEM</SectionLabel>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <D size={20}>SOLARIS</D>
              <M style={{ fontSize: 13, fontWeight: 700, color: C.lime }}>94% MATCH</M>
            </div>
            {[{ t: "Firmware Engineer", f: true, m: "A. Singh" }, { t: "ML Engineer", f: true, m: "P. Mehta" }, { t: "Backend Dev", f: false }].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.rule}` }}>
                <div style={{ width: 7, height: 7, flexShrink: 0, background: r.f ? C.ink : "transparent", border: r.f ? "none" : `1px solid ${C.rule}` }} />
                <M style={{ fontSize: 12, flex: 1, color: r.f ? C.muted : C.ink, textDecoration: r.f ? "line-through" : "none" }}>{r.t}</M>
                {r.f ? <M style={{ fontSize: 11, color: C.muted }}>→ {r.m}</M> : <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono',monospace", border: `1px solid ${C.ink}`, padding: "2px 9px" }}>OPEN</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
function Login({ onBack, onSuccess }) {
  const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const handle = async () => {
    setLoading(true); setError("");
    try {
      const result = await api.login(email, pass);
      onSuccess(result.userId);
    } catch (err) {
      setError(err.message || "Invalid credentials.");
    }
    setLoading(false);
  };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace" }}>
      <style>{BASE_CSS}</style>
      <nav style={{ display: "flex", alignItems: "center", padding: "0 48px", height: 56, borderBottom: `1px solid ${C.rule}`, gap: 16 }}>
        <span onClick={onBack} style={{ fontSize: 11, color: C.muted, cursor: "pointer" }}>← BACK</span>
        <D size={22}>PLORK</D>
      </nav>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, minHeight: "calc(100vh - 56px)" }}>
        <div style={{ width: "100%", maxWidth: 420, border: `1px solid ${C.rule}`, padding: "52px 48px" }}>
          <D size={40} style={{ display: "block", marginBottom: 6 }}>LOG IN</D>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 40 }}>Welcome back to Plork.</p>
          {error && <div style={{ padding: "10px 14px", background: C.redLight, border: `1px solid ${C.red}44`, marginBottom: 20 }}><M style={{ fontSize: 12, color: C.red }}>{error}</M></div>}
          <FieldInput label="UW EMAIL" value={email} onChange={setEmail} placeholder="userid@uwaterloo.ca" type="email" />
          <FieldInput label="PASSWORD" value={pass} onChange={setPass} placeholder="••••••••" type="password" />
          <button onClick={handle} disabled={loading} style={{ width: "100%", padding: "13px", fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, background: C.ink, color: C.bg, border: "none", cursor: "pointer", marginTop: 8, opacity: loading ? 0.6 : 1 }}>{loading ? "LOGGING IN..." : "LOG IN →"}</button>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.rule}`, textAlign: "center" }}>
            <span style={{ fontSize: 11, color: C.muted }}>No account? </span>
            <span onClick={onBack} style={{ fontSize: 11, color: C.ink, cursor: "pointer", textDecoration: "underline" }}>Sign up</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = ["ACCOUNT", "STREAM", "SKILLS", "SCHEDULE", "DONE"];
function Onboarding({ onComplete, onBack }) {
  const [step, setStep] = useState(0); const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", discipline: "", year: "", skills: [], interests: [], built: "", terms: [], commitment: "" });
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const tog = (k, v) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }));
  const canNext = () => {
    if (step === 0) return form.name && form.email && form.password && form.password === form.confirmPassword && form.password.length >= 6;
    if (step === 1) return form.discipline && form.year;
    if (step === 2) return form.skills.length > 0;
    if (step === 3) return form.terms.length > 0;
    return true;
  };
  const finish = async () => {
    setLoading(true);
    try {
      const result = await api.register(form);
      setLoading(false);
      onComplete(result.userId);
    } catch (err) {
      setLoading(false);
      alert("Registration failed: " + (err.message || "Unknown error"));
    }
  };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace", display: "flex", flexDirection: "column" }}>
      <style>{BASE_CSS}</style>
      <div style={{ height: 3, background: C.rule }}><div style={{ height: "100%", width: `${(step / (STEPS.length - 1)) * 100}%`, background: C.lime, transition: "width 0.4s" }} /></div>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: 56, borderBottom: `1px solid ${C.rule}` }}>
        <D size={22}>PLORK</D>
        {step === 0 && <button onClick={onBack} style={{ fontSize: 11, letterSpacing: "0.08em", padding: "8px 20px", border: `1px solid ${C.rule}`, background: "transparent", color: C.body, cursor: "pointer" }}>← BACK TO LOGIN</button>}
      </nav>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "52px 40px", overflowY: "auto" }}>
        <div className="fade-up" key={step} style={{ width: "100%", maxWidth: 580 }}>
          {step === 0 && <><D size={44} style={{ display: "block", marginBottom: 6 }}>CREATE ACCOUNT</D><p style={{ fontSize: 13, color: C.muted, marginBottom: 40 }}>Sign up with your UW email.</p><FieldInput label="FULL NAME" value={form.name} onChange={v => u("name", v)} placeholder="Jamie Kim" /><FieldInput label="UW EMAIL" value={form.email} onChange={v => u("email", v)} placeholder="jkim@uwaterloo.ca" type="email" /><FieldInput label="PASSWORD" value={form.password} onChange={v => u("password", v)} placeholder="••••••••" type="password" hint={form.password && form.password.length < 6 ? "At least 6 characters" : ""} /><FieldInput label="CONFIRM PASSWORD" value={form.confirmPassword || ""} onChange={v => u("confirmPassword", v)} placeholder="••••••••" type="password" hint={form.confirmPassword && form.password !== form.confirmPassword ? "Passwords don't match" : ""} /></>}
          {step === 1 && <><D size={44} style={{ display: "block", marginBottom: 6 }}>YOUR STREAM</D><p style={{ fontSize: 13, color: C.muted, marginBottom: 40 }}>Helps Plork understand your schedule.</p><div style={{ marginBottom: 28 }}><SectionLabel>DISCIPLINE</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{DISCIPLINE_OPTIONS.map(d => <Chip key={d} active={form.discipline === d} onClick={() => u("discipline", d)}>{d}</Chip>)}</div></div><div><SectionLabel>CURRENT TERM</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{YEAR_OPTIONS.map(y => <Chip key={y} active={form.year === y} onClick={() => u("year", y)}>{y}</Chip>)}</div></div></>}
          {step === 2 && <><D size={44} style={{ display: "block", marginBottom: 6 }}>YOUR SKILLS</D><p style={{ fontSize: 13, color: C.muted, marginBottom: 40 }}>Select everything you're comfortable with.</p><div style={{ marginBottom: 28 }}><SectionLabel>TECHNICAL SKILLS</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{SKILL_OPTIONS.map(s => <Chip key={s} active={form.skills.includes(s)} onClick={() => tog("skills", s)}>{s}</Chip>)}</div></div><FieldTextarea label="WHAT I'VE BUILT" value={form.built} onChange={v => u("built", v)} placeholder="Built a lane-detection model for Midnight Sun." hint="1–2 lines" /><div><SectionLabel>INTERESTS — for Crew Mode</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{INTEREST_OPTIONS.map(s => <Chip key={s} active={form.interests.includes(s)} onClick={() => tog("interests", s)}>{s}</Chip>)}</div></div></>}
          {step === 3 && <><D size={44} style={{ display: "block", marginBottom: 6 }}>YOUR SCHEDULE</D><p style={{ fontSize: 13, color: C.muted, marginBottom: 40 }}>Which terms are you on campus?</p><div style={{ marginBottom: 32 }}><SectionLabel>ON-CAMPUS TERMS</SectionLabel><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{ALL_TERMS.map(t => <div key={t} onClick={() => tog("terms", t)} style={{ padding: "14px 18px", border: form.terms.includes(t) ? `2px solid ${C.ink}` : `1px solid ${C.rule}`, background: form.terms.includes(t) ? C.ink : C.surface, cursor: "pointer", textAlign: "center", transition: "all 0.12s", minWidth: 60 }}><D size={15} color={form.terms.includes(t) ? C.lime : C.muted} style={{ display: "block" }}>{t}</D></div>)}</div></div><SectionLabel>COMMITMENT LEVEL</SectionLabel>{COMMITMENTS.map(c => <div key={c} onClick={() => u("commitment", c)} style={{ padding: "13px 18px", border: form.commitment === c ? `2px solid ${C.ink}` : `1px solid ${C.rule}`, background: form.commitment === c ? C.ink : C.surface, cursor: "pointer", marginBottom: 8, display: "flex", gap: 16, alignItems: "center", transition: "all 0.12s" }}><D size={15} color={form.commitment === c ? C.lime : C.muted} style={{ flexShrink: 0 }}>{c}</D><span style={{ fontSize: 12, color: form.commitment === c ? "#7a9a6a" : C.muted, lineHeight: 1.5 }}>{c === "CASUAL" ? "A few hours a week" : c === "SERIOUS" ? "Consistent effort, aiming to ship" : "Startup-track"}</span></div>)}</>}
          {step === 4 && <div style={{ textAlign: "center", paddingTop: 40 }}><div style={{ width: 64, height: 64, background: C.lime, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 24px" }}>✓</div><D size={48} style={{ display: "block", marginBottom: 14 }}>YOU'RE IN.</D><p style={{ fontSize: 14, color: C.body, lineHeight: 1.8, marginBottom: 40, maxWidth: 380, margin: "0 auto 40px" }}>Profile created for <strong>{form.name || "you"}</strong>.<br />{form.discipline} {form.year}{form.skills.length > 0 ? " · " + form.skills.slice(0, 3).join(", ") : ""}</p><button onClick={finish} disabled={loading} style={{ fontSize: 13, letterSpacing: "0.12em", fontWeight: 700, padding: "14px 44px", background: C.ink, color: C.bg, border: "none", cursor: "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "SETTING UP..." : "ENTER PLORK →"}</button></div>}
          {step < 4 && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48, paddingTop: 24, borderTop: `1px solid ${C.rule}` }}><button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{ fontSize: 11, padding: "10px 24px", border: `1px solid ${C.rule}`, background: "transparent", color: step === 0 ? C.rule : C.body, cursor: step === 0 ? "default" : "pointer" }}>← BACK</button><button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={!canNext()} style={{ fontSize: 11, letterSpacing: "0.1em", padding: "10px 28px", border: "none", background: canNext() ? C.ink : C.rule, color: canNext() ? C.bg : C.muted, cursor: canNext() ? "pointer" : "default", fontWeight: 700 }}>NEXT →</button></div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST MODAL
// ─────────────────────────────────────────────────────────────────────────────
function PostModal({ mode, onClose, onSubmit, userId }) {
  const isBuild = mode === "BUILD";
  const [step, setStep] = useState(0); const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", tagline: "", category: "", stage: "", commitment: "", type: "", spots: 2, roles: [{ title: "", skills: [] }], terms: [] });
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addRole = () => setForm(f => ({ ...f, roles: [...f.roles, { title: "", skills: [] }] }));
  const removeRole = i => setForm(f => ({ ...f, roles: f.roles.filter((_, j) => j !== i) }));
  const updRole = (i, k, v) => setForm(f => ({ ...f, roles: f.roles.map((r, j) => j === i ? { ...r, [k]: v } : r) }));
  const togSkill = (i, s) => setForm(f => ({ ...f, roles: f.roles.map((r, j) => j === i ? { ...r, skills: r.skills.includes(s) ? r.skills.filter(x => x !== s) : [...r.skills, s] } : r) }));
  const togTerm = t => setForm(f => ({ ...f, terms: f.terms.includes(t) ? f.terms.filter(x => x !== t) : [...f.terms, t] }));
  const canStep = () => { if (step === 0) return form.name && form.tagline && form.category && (isBuild ? (form.stage && form.commitment) : form.type); if (step === 1) return isBuild ? form.roles.every(r => r.title) : true; return form.terms.length > 0; };
  const submit = async () => {
    setLoading(true);
    const p = { name: form.name.toUpperCase(), tagline: form.tagline, category: form.category, stage: isBuild ? form.stage : undefined, type: !isBuild ? form.type : undefined, commitment: isBuild ? form.commitment : undefined, match: Math.floor(Math.random() * 20) + 70, yours: true, roles: isBuild ? form.roles.map(r => ({ ...r, filled: false })) : undefined, spots: !isBuild ? form.spots : undefined, tags: !isBuild ? [form.category] : undefined, terms: { founder: form.terms, overlap: form.terms } };
    const created = await api.createProject(p, userId);
    onSubmit(created); onClose(); setLoading(false);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(21,21,13,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div className="slide-in" style={{ width: "100%", maxWidth: 580, background: C.bg, border: `1px solid ${C.rule}`, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "22px 28px", borderBottom: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div><D size={28}>{isBuild ? "POST A PROJECT" : "POST AN ACTIVITY"}</D><M style={{ fontSize: 10, color: C.muted, display: "block", marginTop: 2 }}>STEP {step + 1} OF 3 — {["DETAILS", "ROLES", "SCHEDULE"][step]}</M></div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.rule}`, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: C.muted }}>✕</button>
        </div>
        <div style={{ height: 2, background: C.rule, flexShrink: 0 }}><div style={{ height: "100%", width: `${((step + 1) / 3) * 100}%`, background: C.lime, transition: "width 0.3s" }} /></div>
        <div className="fade-up" key={step} style={{ flex: 1, overflowY: "auto", padding: "28px 28px 0" }}>
          {step === 0 && <>
            <FieldInput label="NAME" value={form.name} onChange={v => u("name", v)} placeholder={isBuild ? "e.g. Solar Rover" : "e.g. Volleyball"} />
            <FieldTextarea label="ONE-LINE PITCH" value={form.tagline} onChange={v => u("tagline", v)} rows={2} placeholder="What are you building and why?" hint="120 chars" />
            <div style={{ marginBottom: 20 }}><SectionLabel>CATEGORY</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{(isBuild ? CATEGORIES_BUILD : CATEGORIES_CREW).map(c => <Chip key={c} active={form.category === c} onClick={() => u("category", c)}>{c}</Chip>)}</div></div>
            {isBuild && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}><div><SectionLabel>STAGE</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{STAGES.map(s => <Chip key={s} small active={form.stage === s} onClick={() => u("stage", s)}>{s}</Chip>)}</div></div><div><SectionLabel>COMMITMENT</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{COMMITMENTS.map(c => <Chip key={c} small active={form.commitment === c} onClick={() => u("commitment", c)}>{c}</Chip>)}</div></div></div>}
            {!isBuild && <><div style={{ marginBottom: 20 }}><SectionLabel>ACTIVITY TYPE</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{ACTIVITY_TYPES.map(t => <Chip key={t} active={form.type === t} onClick={() => u("type", t)}>{t}</Chip>)}</div></div><div style={{ marginBottom: 20 }}><SectionLabel>SPOTS NEEDED</SectionLabel><div style={{ display: "flex", alignItems: "center", gap: 12 }}><button onClick={() => u("spots", Math.max(1, form.spots - 1))} style={{ width: 36, height: 36, border: `1px solid ${C.rule}`, background: C.surface, cursor: "pointer", fontSize: 18 }}>−</button><M style={{ fontSize: 20, fontWeight: 600, minWidth: 24, textAlign: "center" }}>{form.spots}</M><button onClick={() => u("spots", Math.min(20, form.spots + 1))} style={{ width: 36, height: 36, border: `1px solid ${C.rule}`, background: C.surface, cursor: "pointer", fontSize: 18 }}>+</button><M style={{ fontSize: 11, color: C.muted }}>spots needed</M></div></div></>}
          </>}
          {step === 1 && <>
            {isBuild && <>{form.roles.map((role, i) => <div key={i} style={{ border: `1px solid ${C.rule}`, padding: "18px", marginBottom: 14, background: C.surface }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><M style={{ fontSize: 11, color: C.muted, letterSpacing: "0.1em" }}>ROLE {i + 1}</M>{form.roles.length > 1 && <button onClick={() => removeRole(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.muted }}>✕ remove</button>}</div><input value={role.title} onChange={e => updRole(i, "title", e.target.value)} placeholder="e.g. Firmware Engineer" style={{ width: "100%", padding: "10px 12px", fontSize: 13, color: C.ink, background: C.bg, border: `1px solid ${C.rule}`, outline: "none", marginBottom: 14 }} onFocus={e => e.target.style.borderColor = C.lime} onBlur={e => e.target.style.borderColor = C.rule} /><SectionLabel>REQUIRED SKILLS</SectionLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{SKILL_OPTIONS.map(s => <Chip key={s} small active={role.skills.includes(s)} onClick={() => togSkill(i, s)}>{s}</Chip>)}</div></div>)}<button onClick={addRole} style={{ width: "100%", padding: "11px", border: `1px dashed ${C.rule}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 11, letterSpacing: "0.08em" }}>+ ADD ANOTHER ROLE</button></>}
            {!isBuild && <div style={{ paddingTop: 20 }}><p style={{ fontSize: 13, color: C.body, marginBottom: 24, lineHeight: 1.6 }}>You're looking for {form.spots} person{form.spots !== 1 ? "s" : ""} to join <strong>{form.name || "your activity"}</strong>.</p></div>}
          </>}
          {step === 2 && <>
            <p style={{ fontSize: 13, color: C.body, marginBottom: 24, lineHeight: 1.6 }}>Which terms are you running this {isBuild ? "project" : "activity"}?</p>
            <SectionLabel>ACTIVE TERMS</SectionLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>{ALL_TERMS.map(t => <div key={t} onClick={() => togTerm(t)} style={{ padding: "14px 18px", border: form.terms.includes(t) ? `2px solid ${C.ink}` : `1px solid ${C.rule}`, background: form.terms.includes(t) ? C.ink : C.surface, cursor: "pointer", textAlign: "center", transition: "all 0.12s", minWidth: 60 }}><D size={15} color={form.terms.includes(t) ? C.lime : C.muted} style={{ display: "block" }}>{t}</D></div>)}</div>
            {form.terms.length > 0 && <div style={{ padding: "14px 18px", border: `1px solid ${C.lime}66`, background: C.limeLight }}><M style={{ fontSize: 12, color: C.limeDark }}>✓ Active: {form.terms.join("  ·  ")}</M></div>}
          </>}
        </div>
        <div style={{ padding: "20px 28px", borderTop: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()} style={{ fontSize: 11, padding: "10px 22px", border: `1px solid ${C.rule}`, background: "transparent", color: C.body, cursor: "pointer" }}>{step === 0 ? "CANCEL" : "← BACK"}</button>
          {step < 2 ? <button onClick={() => canStep() && setStep(s => s + 1)} style={{ fontSize: 11, letterSpacing: "0.1em", padding: "10px 28px", border: "none", background: canStep() ? C.ink : C.rule, color: canStep() ? C.bg : C.muted, cursor: canStep() ? "pointer" : "default", fontWeight: 700 }}>NEXT →</button>
            : <button onClick={submit} disabled={!canStep() || loading} style={{ fontSize: 11, letterSpacing: "0.1em", padding: "10px 28px", border: "none", background: canStep() ? C.lime : C.rule, color: canStep() ? C.limeInk : C.muted, cursor: canStep() ? "pointer" : "default", fontWeight: 700 }}>{loading ? "POSTING..." : "POST ✓"}</button>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE PAGE
// ─────────────────────────────────────────────────────────────────────────────
function ProfilePage({ profile, userId, onSave, onBack }) {
  const [form, setForm] = useState({ ...profile }); const [saved, setSaved] = useState(false); const [loading, setLoading] = useState(false);
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const tog = (k, v) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }));
  const save = async () => {
    if (!userId) { alert("No user ID found"); return; }
    setLoading(true);
    const u2 = await api.updateProfile(userId, form);
    onSave(u2);
    setSaved(true);
    setLoading(false);
    setTimeout(() => setSaved(false), 2000);
  };
  const SaveBtn = () => <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 24px" }}>{saved && <M style={{ fontSize: 11, color: C.limeDark }}>✓ Saved</M>}<button onClick={save} disabled={loading} style={{ fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, padding: "8px 22px", border: "none", background: C.lime, color: C.limeInk, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "SAVING..." : "SAVE CHANGES"}</button></div>;
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace", color: C.ink }}>
      <style>{BASE_CSS}</style>
      <SubTopBar onBack={onBack} rightSlot={<SaveBtn />} />
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: "calc(100vh - 52px)" }}>
        <div style={{ borderRight: `1px solid ${C.rule}`, padding: "36px 28px", background: C.surface }}>
          <div style={{ width: 72, height: 72, background: C.limeLight, border: `1px solid ${C.lime}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 20 }}>🧑‍💻</div>
          <D size={28} style={{ display: "block", marginBottom: 4 }}>{form.name || "Your Name"}</D>
          <M style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>{form.email || "—"}</M>
          <M style={{ fontSize: 12, color: C.body, display: "block", marginBottom: 24 }}>{form.discipline || "—"} · {form.year || "—"}</M>
          <SectionDivider />
          <SectionLabel>SKILLS</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 24 }}>{form.skills.length > 0 ? form.skills.map(s => <M key={s} style={{ fontSize: 10, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}66`, padding: "2px 8px" }}>{s}</M>) : <M style={{ fontSize: 11, color: C.muted }}>None added yet</M>}</div>
          <SectionLabel>INTERESTS</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 24 }}>{form.interests.length > 0 ? form.interests.map(s => <M key={s} style={{ fontSize: 10, background: C.surface2, color: C.body, border: `1px solid ${C.rule}`, padding: "2px 8px" }}>{s}</M>) : <M style={{ fontSize: 11, color: C.muted }}>None added yet</M>}</div>
          <SectionLabel>ON-CAMPUS TERMS</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{ALL_TERMS.map(t => <M key={t} style={{ fontSize: 10, padding: "2px 7px", background: form.terms.includes(t) ? C.ink : C.surface2, color: form.terms.includes(t) ? C.lime : C.muted, border: `1px solid ${form.terms.includes(t) ? C.ink : C.rule}` }}>{t}</M>)}</div>
        </div>
        <div style={{ overflowY: "auto", padding: "36px 48px", background: C.detail }}>
          <D size={36} style={{ display: "block", marginBottom: 4 }}>EDIT PROFILE</D>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 36 }}>Changes update your match score and visibility to other Plork users.</p>
          <SectionLabel>BASIC INFO</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}><FieldInput label="FULL NAME" value={form.name} onChange={v => u("name", v)} placeholder="Jamie Kim" /><FieldInput label="UW EMAIL" value={form.email} onChange={v => u("email", v)} placeholder="jkim@uwaterloo.ca" type="email" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}><FieldInput label="GITHUB / PORTFOLIO" value={form.github || ""} onChange={v => u("github", v)} placeholder="github.com/username" /><div /></div>
          <SectionDivider />
          <SectionLabel>YOUR STREAM</SectionLabel>
          <div style={{ marginBottom: 20 }}><label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 10 }}>DISCIPLINE</label><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{DISCIPLINE_OPTIONS.map(d => <Chip key={d} active={form.discipline === d} onClick={() => u("discipline", d)}>{d}</Chip>)}</div></div>
          <div style={{ marginBottom: 20 }}><label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 10 }}>CURRENT TERM</label><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{YEAR_OPTIONS.map(y => <Chip key={y} active={form.year === y} onClick={() => u("year", y)}>{y}</Chip>)}</div></div>
          <SectionDivider />
          <SectionLabel>TECHNICAL SKILLS</SectionLabel>
          <div style={{ marginBottom: 20 }}><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{SKILL_OPTIONS.map(s => <Chip key={s} active={form.skills.includes(s)} onClick={() => tog("skills", s)}>{s}</Chip>)}</div></div>
          <FieldTextarea label="WHAT I'VE BUILT" value={form.built || ""} onChange={v => u("built", v)} placeholder="Built a lane-detection model for Midnight Sun." hint="1–2 lines" rows={3} />
          <SectionDivider />
          <SectionLabel>INTERESTS — shown in Crew Mode</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 20 }}>{INTEREST_OPTIONS.map(s => <Chip key={s} active={form.interests.includes(s)} onClick={() => tog("interests", s)}>{s}</Chip>)}</div>
          <SectionDivider />
          <SectionLabel>CO-OP SCHEDULE</SectionLabel>
          <div style={{ marginBottom: 20 }}><label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 12 }}>ON-CAMPUS TERMS</label><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{ALL_TERMS.map(t => <div key={t} onClick={() => tog("terms", t)} style={{ padding: "14px 18px", border: form.terms.includes(t) ? `2px solid ${C.ink}` : `1px solid ${C.rule}`, background: form.terms.includes(t) ? C.ink : C.surface, cursor: "pointer", textAlign: "center", transition: "all 0.12s", minWidth: 60 }}><D size={15} color={form.terms.includes(t) ? C.lime : C.muted} style={{ display: "block" }}>{t}</D></div>)}</div></div>
          <div><label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 12 }}>COMMITMENT LEVEL</label><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{COMMITMENTS.map(c => <div key={c} onClick={() => u("commitment", c)} style={{ padding: "13px 18px", border: form.commitment === c ? `2px solid ${C.ink}` : `1px solid ${C.rule}`, background: form.commitment === c ? C.ink : C.surface, cursor: "pointer", display: "flex", gap: 16, alignItems: "center", transition: "all 0.12s" }}><D size={15} color={form.commitment === c ? C.lime : C.muted} style={{ flexShrink: 0 }}>{c}</D><span style={{ fontSize: 12, color: form.commitment === c ? "#7a9a6a" : C.muted, lineHeight: 1.5 }}>{c === "CASUAL" ? "A few hours a week, fits around coursework" : c === "SERIOUS" ? "Consistent effort, aiming to ship something real" : "Startup-track — applying to Velocity or W+Accelerate"}</span></div>)}</div></div>
          <div style={{ marginTop: 40, paddingTop: 28, borderTop: `1px solid ${C.rule}`, display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={save} disabled={loading} style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, padding: "12px 32px", border: "none", background: C.lime, color: C.limeInk, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "SAVING..." : "SAVE CHANGES"}</button>
            <button onClick={onBack} style={{ fontSize: 12, padding: "12px 24px", border: `1px solid ${C.rule}`, background: "transparent", color: C.muted, cursor: "pointer" }}>CANCEL</button>
            {saved && <M style={{ fontSize: 12, color: C.limeDark }}>✓ Changes saved!</M>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MY APPLICATIONS PAGE  (user tracking their own submitted applications)
// ─────────────────────────────────────────────────────────────────────────────
function MyApplicationsPage({ initialApps, onBack, userId }) {
  const [apps, setApps] = useState(initialApps || []);
  const [loading, setLoading] = useState(!initialApps);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!initialApps && userId) {
      // GET /api/applications/mine
      api.getMyApplications(userId).then(data => { setApps(data); setLoading(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const counts = {
    ALL: apps.length,
    PENDING: apps.filter(a => a.status === "PENDING").length,
    ACCEPTED: apps.filter(a => a.status === "ACCEPTED").length,
    REJECTED: apps.filter(a => a.status === "REJECTED").length,
  };
  const shown = statusFilter === "ALL" ? apps : apps.filter(a => a.status === statusFilter);
  const fmt = iso => new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  const statusLine = { PENDING: "Under review — founder will respond via Plork.", ACCEPTED: "🎉 Accepted! Check your messages to coordinate next steps.", REJECTED: "Not a fit this time. Keep applying — your profile is strong." };
  const accentColor = { PENDING: C.amber, ACCEPTED: C.lime, REJECTED: C.red };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace", color: C.ink }}>
      <style>{BASE_CSS}</style>
      <SubTopBar onBack={onBack} />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "calc(100vh - 52px)" }}>
        {/* Sidebar */}
        <div style={{ borderRight: `1px solid ${C.rule}`, padding: "32px 24px", background: C.surface }}>
          <D size={26} style={{ display: "block", marginBottom: 4 }}>MY APPLICATIONS</D>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>Track the roles you've applied for.</p>
          <SectionLabel>FILTER</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 28 }}>
            {["ALL", "PENDING", "ACCEPTED", "REJECTED"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", border: statusFilter === s ? `1.5px solid ${C.ink}` : `1px solid ${C.rule}`, background: statusFilter === s ? C.ink : "transparent", cursor: "pointer", transition: "all 0.1s" }}>
                <M style={{ fontSize: 11, letterSpacing: "0.06em", color: statusFilter === s ? C.bg : C.body }}>{s}</M>
                <M style={{ fontSize: 11, fontWeight: 600, color: statusFilter === s ? C.lime : C.muted }}>{counts[s]}</M>
              </button>
            ))}
          </div>
          <SectionLabel>SUMMARY</SectionLabel>
          {[["Applied", counts.ALL], ["Pending", counts.PENDING], ["Accepted", counts.ACCEPTED], ["Rejected", counts.REJECTED]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.rule}` }}>
              <M style={{ fontSize: 11, color: C.muted }}>{l}</M>
              <M style={{ fontSize: 11, fontWeight: 600, color: C.body }}>{v}</M>
            </div>
          ))}
        </div>
        {/* Main */}
        <div style={{ padding: "32px 40px", overflowY: "auto", background: C.detail }}>
          {loading && <M style={{ fontSize: 13, color: C.muted }}>Loading…</M>}
          {!loading && shown.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <M style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>No {statusFilter !== "ALL" ? statusFilter.toLowerCase() + " " : ""} applications yet.<br />Browse projects and hit APPLY to get started.</M>
            </div>
          )}
          {!loading && shown.map(app => {
            const open = expanded === app.id;
            return (
              <div key={app.id} style={{ border: `1px solid ${C.rule}`, marginBottom: 10, background: C.bg }}>
                <div onClick={() => setExpanded(open ? null : app.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", cursor: "pointer" }}>
                  <div style={{ width: 3, alignSelf: "stretch", background: accentColor[app.status] || C.amber, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <D size={19}>{app.projectName}</D>
                      <StatusBadge status={app.status} />
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <M style={{ fontSize: 12, color: C.body }}>{app.roleTitle}</M>
                      <M style={{ fontSize: 10, color: C.muted, background: C.surface2, padding: "2px 7px" }}>{app.projectCategory}</M>
                      <M style={{ fontSize: 10, color: C.muted }}>Applied {fmt(app.createdAt)}</M>
                      {app.status !== "PENDING" && <M style={{ fontSize: 10, color: C.muted }}>· Updated {fmt(app.updatedAt)}</M>}
                    </div>
                  </div>
                  <M style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{open ? "▲" : "▼"}</M>
                </div>
                {open && (
                  <div className="fade-up" style={{ borderTop: `1px solid ${C.rule}`, padding: "20px 21px 20px 35px", background: C.surface }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                      <div>
                        <SectionLabel>YOUR INTRO</SectionLabel>
                        <p style={{ fontSize: 13, color: C.body, lineHeight: 1.7, marginBottom: 14 }}>{app.intro}</p>
                        {app.links && <><SectionLabel>LINKS</SectionLabel><M style={{ fontSize: 12, color: C.ink }}>{app.links}</M></>}
                      </div>
                      <div>
                        <SectionLabel>ROLE SKILLS</SectionLabel>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>{app.roleSkills.map(s => <M key={s} style={{ fontSize: 10, color: C.limeDark, background: C.limeLight, border: `1px solid ${C.lime}55`, padding: "2px 8px" }}>{s}</M>)}</div>
                        <SectionLabel>STATUS UPDATE</SectionLabel>
                        <p style={{ fontSize: 12, color: app.status === "ACCEPTED" ? C.limeDark : app.status === "REJECTED" ? C.red : C.body, lineHeight: 1.6 }}>{statusLine[app.status]}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MANAGE APPLICANTS PAGE  (founder reviewing inbound applications)
// ─────────────────────────────────────────────────────────────────────────────
function ManageApplicantsPage({ project, onBack }) {
  const [applicants, setApplicants] = useState([]); const [loading, setLoading] = useState(true); const [updatingId, setUpdatingId] = useState(null);
  useEffect(() => {
    // GET /api/projects/:id/applicants
    api.getProjectApplicants(project.id).then(data => { setApplicants(data); setLoading(false); });
  }, [project.id]);

  const decide = async (id, status) => {
    setUpdatingId(id);
    // PUT /api/applications/:id/status
    await api.updateApplicationStatus(id, status);
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    setUpdatingId(null);
  };
  const pending = applicants.filter(a => a.status === "PENDING");
  const decided = applicants.filter(a => a.status !== "PENDING");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace", color: C.ink }}>
      <style>{BASE_CSS}</style>
      <SubTopBar onBack={onBack} backLabel="BACK TO PROJECT" />
      <div style={{ padding: "36px 48px", maxWidth: 800, background: C.detail, minHeight: "calc(100vh - 52px)" }}>
        <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", display: "block", marginBottom: 8 }}>APPLICANTS FOR</M>
        <D size={40} style={{ display: "block", marginBottom: 4 }}>{project.name}</D>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 36 }}>{pending.length} pending · {decided.length} decided</p>

        {loading && <M style={{ fontSize: 13, color: C.muted }}>Loading applicants…</M>}
        {!loading && applicants.length === 0 && <div style={{ paddingTop: 48, textAlign: "center" }}><M style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>No applicants yet.</M></div>}

        {!loading && pending.length > 0 && <>
          <SectionLabel>AWAITING REVIEW ({pending.length})</SectionLabel>
          {pending.map(app => (
            <div key={app.id} style={{ border: `1px solid ${C.rule}`, marginBottom: 16, background: C.bg, padding: "22px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, background: C.limeLight, border: `1px solid ${C.lime}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🧑‍💻</div>
                  <div>
                    <M style={{ fontSize: 13, color: C.ink, fontWeight: 600, display: "block" }}>{app.applicantName}</M>
                    <M style={{ fontSize: 11, color: C.muted }}>{app.applicantStream}</M>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <M style={{ fontSize: 24, fontWeight: 700, color: app.applicantMatch > 90 ? C.lime : app.applicantMatch > 80 ? "#aaaa00" : C.muted, display: "block", lineHeight: 1 }}>{app.applicantMatch}%</M>
                  <M style={{ fontSize: 9, color: C.muted, letterSpacing: "0.1em" }}>MATCH</M>
                </div>
              </div>
              <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>APPLYING FOR</M>
              <M style={{ fontSize: 13, color: C.ink, display: "block", marginBottom: 12 }}>{app.roleTitle}</M>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>{app.applicantSkills.map(s => <M key={s} style={{ fontSize: 10, color: C.limeDark, background: C.limeLight, border: `1px solid ${C.lime}55`, padding: "2px 8px" }}>{s}</M>)}</div>
              <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>{ALL_TERMS.map(t => { const th = app.applicantTerms.includes(t), ov = th && project.terms?.overlap?.includes(t); return <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><div style={{ width: 8, height: ov ? 20 : th ? 12 : 6, background: ov ? C.lime : th ? C.ink : C.rule }} /><M style={{ fontSize: 7, color: ov ? C.limeDark : C.muted }}>{t}</M></div>; })}</div>
              <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 7 }}>THEIR INTRO</M>
              <p style={{ fontSize: 13, color: C.body, lineHeight: 1.7, marginBottom: 16 }}>{app.intro}</p>
              {app.links && <M style={{ fontSize: 12, color: C.lime, display: "block", marginBottom: 18 }}>{app.links}</M>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => decide(app.id, "ACCEPTED")} disabled={updatingId === app.id} style={{ flex: 1, padding: "11px", fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, background: C.lime, color: C.limeInk, border: "none", cursor: "pointer", opacity: updatingId === app.id ? 0.6 : 1 }}>✓ ACCEPT</button>
                <button onClick={() => decide(app.id, "REJECTED")} disabled={updatingId === app.id} style={{ flex: 1, padding: "11px", fontSize: 12, letterSpacing: "0.1em", fontWeight: 600, background: "transparent", color: C.red, border: `1px solid ${C.red}55`, cursor: "pointer", opacity: updatingId === app.id ? 0.6 : 1 }}>✕ PASS</button>
              </div>
            </div>
          ))}
        </>}

        {!loading && decided.length > 0 && <>
          {pending.length > 0 && <SectionDivider />}
          <SectionLabel>DECIDED ({decided.length})</SectionLabel>
          {decided.map(app => (
            <div key={app.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", border: `1px solid ${C.rule}`, background: C.bg, marginBottom: 7 }}>
              <div style={{ width: 3, alignSelf: "stretch", background: app.status === "ACCEPTED" ? C.lime : C.red, flexShrink: 0 }} />
              <M style={{ fontSize: 13, color: C.body, flex: 1 }}>{app.applicantName}</M>
              <M style={{ fontSize: 11, color: C.muted }}>{app.roleTitle}</M>
              <StatusBadge status={app.status} />
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST TO JOIN
// ─────────────────────────────────────────────────────────────────────────────
function RequestToJoin({ project, role, onBack, onSubmitted, userId }) {
  const [intro, setIntro] = useState(""); const [links, setLinks] = useState(""); const [loading, setLoading] = useState(false); const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!intro.trim()) return;
    if (!userId) { alert("Please log in first"); return; }
    setLoading(true);
    // POST /api/applications
    const created = await api.submitApplication({ projectId: project.id, roleTitle: role.title, intro, links }, userId);
    setLoading(false); setSent(true);
    if (onSubmitted) onSubmitted({ ...created, projectName: project.name, projectCategory: project.category, roleSkills: role.skills });
  };

  if (sent) return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{BASE_CSS}</style>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ width: 64, height: 64, background: C.lime, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 24px" }}>✓</div>
        <D size={44} style={{ display: "block", marginBottom: 12 }}>REQUEST SENT</D>
        <p style={{ fontSize: 14, color: C.body, lineHeight: 1.8, marginBottom: 32 }}>
          Your request to join <strong>{project.name}</strong> as <strong>{role.title}</strong> has been sent.<br />Track its status in <strong>My Applications</strong>.
        </p>
        <button onClick={onBack} style={{ fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, padding: "12px 32px", background: C.ink, color: C.bg, border: "none", cursor: "pointer" }}>← BACK TO PLORK</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace", color: C.ink }}>
      <style>{BASE_CSS}</style>
      <div style={{ display: "flex", alignItems: "stretch", borderBottom: `1px solid ${C.rule}`, height: 52, flexShrink: 0 }}>
        <div style={{ padding: "0 24px", display: "flex", alignItems: "center", borderRight: `1px solid ${C.rule}`, gap: 10 }}><D size={24}>PLORK</D></div>
        <button onClick={onBack} style={{ padding: "0 22px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, letterSpacing: "0.08em", color: C.muted, background: "transparent", border: "none", borderRight: `1px solid ${C.rule}` }}>← BACK</button>
        <div style={{ padding: "0 24px", display: "flex", alignItems: "center" }}><M style={{ fontSize: 11, color: C.muted }}>REQUEST TO JOIN</M></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "calc(100vh - 52px)" }}>
        {/* Left: context */}
        <div style={{ padding: "48px 52px", borderRight: `1px solid ${C.rule}`, background: C.detail }}>
          <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", display: "block", marginBottom: 28 }}>YOU'RE APPLYING FOR</M>
          <div style={{ border: `1px solid ${C.rule}`, padding: "22px", marginBottom: 28, background: C.bg }}>
            <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>OPEN ROLE</M>
            <D size={28} style={{ display: "block", marginBottom: 6 }}>{role.title}</D>
            <D size={16} color={C.muted} style={{ display: "block", marginBottom: 16 }}>{project.name}</D>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{role.skills?.map(s => <M key={s} style={{ fontSize: 10, color: C.limeDark, background: C.limeLight, border: `1px solid ${C.lime}55`, padding: "2px 8px" }}>{s}</M>)}</div>
          </div>
          <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", display: "block", marginBottom: 14 }}>ABOUT THE PROJECT</M>
          <p style={{ fontSize: 13, color: C.body, lineHeight: 1.75, marginBottom: 24 }}>{project.tagline}</p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[["CATEGORY", project.category], ["STAGE", project.stage], ["COMMITMENT", project.commitment]].map(([k, v]) => v && (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.rule}` }}>
                <M style={{ fontSize: 11, color: C.muted }}>{k}</M>
                <M style={{ fontSize: 11, color: C.body }}>{v}</M>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", display: "block", marginBottom: 12 }}>TERM OVERLAP WITH TEAM</M>
            <div style={{ display: "flex", gap: 6 }}>
              {ALL_TERMS.map(t => { const inOv = project.terms?.overlap?.includes(t), yours = YOU_TERMS.includes(t), both = inOv && yours; return <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: both ? 24 : inOv || yours ? 16 : 8, background: both ? C.lime : inOv || yours ? C.ink : C.rule }} /><M style={{ fontSize: 8, color: both ? C.limeDark : C.muted }}>{t}</M></div>; })}
            </div>
          </div>
        </div>
        {/* Right: form */}
        <div style={{ padding: "48px 52px", overflowY: "auto" }}>
          <D size={40} style={{ display: "block", marginBottom: 6 }}>YOUR REQUEST</D>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 40, lineHeight: 1.6 }}>Write a short intro — 2–3 sentences is enough. The founder will see your skills and schedule automatically.</p>
          <FieldTextarea label="INTRO — why you, why this project?" value={intro} onChange={setIntro} placeholder="I'm a 3A ECE student who's been working with ML pipelines for two terms. My Node.js + Python background is a strong fit. I can commit 8–10 hours a week starting W26." rows={5} hint="2–3 sentences" />
          <FieldInput label="LINKS — GitHub, portfolio, or project (optional)" value={links} onChange={setLinks} placeholder="github.com/yourname" />
          <div style={{ border: `1px solid ${C.rule}`, padding: "18px", background: C.surface, marginBottom: 32 }}>
            <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 14 }}>WHAT THE FOUNDER SEES</M>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div><M style={{ fontSize: 13, color: C.ink, fontWeight: 600, display: "block", marginBottom: 2 }}>Jamie Kim</M><M style={{ fontSize: 11, color: C.muted }}>ECE 3A · On campus W25, F25, W26</M></div>
              <M style={{ fontSize: 14, fontWeight: 700, color: C.lime }}>94%</M>
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{["React", "TypeScript", "ML/AI", "Python"].map(s => <M key={s} style={{ fontSize: 10, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}66`, padding: "2px 8px" }}>{s}</M>)}</div>
          </div>
          <button onClick={submit} disabled={!intro.trim() || loading} style={{ width: "100%", padding: "14px", fontSize: 13, letterSpacing: "0.1em", fontWeight: 700, background: intro.trim() && !loading ? C.lime : C.rule, color: intro.trim() && !loading ? C.limeInk : C.muted, border: "none", cursor: intro.trim() && !loading ? "pointer" : "default", transition: "all 0.15s" }}>
            {loading ? "SENDING..." : "SEND REQUEST →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
function MainApp({ userId: propUserId }) {
  const [mode, setMode] = useState("BUILD");
  const [projects, setProjects] = useState(INIT_PROJECTS);
  const [activities, setActivities] = useState(INIT_ACTIVITIES);
  const [selectedId, setSelectedId] = useState(1);
  const [tab, setTab] = useState("ROLES");
  const [showPost, setShowPost] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [profile, setProfile] = useState(INIT_PROFILE);
  const [userId] = useState(propUserId); // Use userId from props
  const [myApps, setMyApps] = useState(MOCK_APPLICATIONS);
  const [requestTarget, setRequestTarget] = useState(null);
  const [subPage, setSubPage] = useState(null);   // "profile" | "applications" | "manageApplicants"
  const [manageProject, setManageProject] = useState(null);

  // Fetch profile and projects when userId changes
  useEffect(() => {
    if (userId) {
      api.getProfile(userId).then(data => {
        setProfile(data);
      }).catch(err => {
        console.error("Failed to load profile:", err);
      });

      // Fetch projects with userId to show ownership
      api.getProjects("BUILD", userId).then(data => {
        setProjects(data);
      }).catch(err => {
        console.error("Failed to load projects:", err);
      });

      api.getProjects("CREW", userId).then(data => {
        setActivities(data);
      }).catch(err => {
        console.error("Failed to load activities:", err);
      });
    }
  }, [userId]);

  const items = mode === "BUILD" ? projects : activities;
  const filtered = filter === "YOURS" ? items.filter(i => i.yours) : items;
  const sel = items.find(i => i.id === selectedId) || items[0];
  const openRoles = sel?.roles?.filter(r => !r.filled) || [];
  const filledRoles = sel?.roles?.filter(r => r.filled) || [];
  const pendingCount = myApps.filter(a => a.status === "PENDING").length;

  const switchMode = m => { setMode(m); setSelectedId(m === "BUILD" ? 1 : 4); setTab(m === "BUILD" ? "ROLES" : "SPOTS"); setFilter("ALL"); };
  const handlePost = async (item) => {
    // Refresh projects from database after creating
    if (userId) {
      try {
        const updated = await api.getProjects(mode === "BUILD" ? "BUILD" : "CREW", userId);
        if (mode === "BUILD") {
          setProjects(updated);
          setSelectedId(updated[0]?.id || item.id);
        } else {
          setActivities(updated);
          setSelectedId(updated[0]?.id || item.id);
        }
      } catch (err) {
        console.error("Failed to refresh projects:", err);
        // Fallback to old behavior
        if (mode === "BUILD") { setProjects(p => [...p, item]); setSelectedId(item.id); }
        else { setActivities(a => [...a, item]); setSelectedId(item.id); }
      }
    } else {
      // Fallback if no userId
      if (mode === "BUILD") { setProjects(p => [...p, item]); setSelectedId(item.id); }
      else { setActivities(a => [...a, item]); setSelectedId(item.id); }
    }
    setTab(mode === "BUILD" ? "ROLES" : "SPOTS");
  };
  const handleApplied = newApp => setMyApps(prev => [...prev, { id: `app_${Date.now()}`, ...newApp }]);

  if (subPage === "profile") return <ProfilePage profile={profile} userId={userId} onSave={p => { setProfile(p); setSubPage(null); }} onBack={() => setSubPage(null)} />;
  if (subPage === "applications") return <MyApplicationsPage initialApps={myApps} onBack={() => setSubPage(null)} userId={userId} />;
  if (subPage === "manage" && manageProject) return <ManageApplicantsPage project={manageProject} onBack={() => { setSubPage(null); setManageProject(null); }} />;
  if (requestTarget) return <RequestToJoin project={requestTarget.project} role={requestTarget.role} onBack={() => setRequestTarget(null)} onSubmitted={handleApplied} userId={userId} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, display: "flex", flexDirection: "column", fontFamily: "'IBM Plex Mono',monospace" }}>
      <style>{BASE_CSS}</style>
      {showPost && <PostModal mode={mode} onClose={() => setShowPost(false)} onSubmit={handlePost} userId={userId} />}

      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "stretch", borderBottom: `1px solid ${C.rule}`, height: 52, flexShrink: 0, background: C.bg }}>
        <div style={{ padding: "0 24px", display: "flex", alignItems: "center", borderRight: `1px solid ${C.rule}`, gap: 10 }}>
          <D size={24}>PLORK</D>
          <div style={{ width: 5, height: 5, background: C.lime, animation: "blink 1.4s infinite" }} />
        </div>
        {["BUILD", "CREW"].map(m => (
          <button key={m} onClick={() => switchMode(m)} style={{ padding: "0 22px", display: "flex", alignItems: "center", cursor: "pointer", fontSize: 11, letterSpacing: "0.1em", color: mode === m ? C.ink : C.muted, background: "transparent", border: "none", borderBottom: mode === m ? `2px solid ${C.lime}` : "2px solid transparent", transition: "color 0.12s", userSelect: "none" }}>{m} MODE</button>
        ))}
        <div className="topbar-meta" style={{ marginLeft: "auto", display: "flex", borderLeft: `1px solid ${C.rule}` }}>
          {[["STREAM", profile.discipline + " " + profile.year], ["TERM", "W26"]].map(([l, v]) => (
            <div key={l} style={{ padding: "0 18px", borderRight: `1px solid ${C.rule}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.12em", marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 12, color: C.body }}>{v}</div>
            </div>
          ))}
          {/* MY APPLICATIONS button with pending badge */}
          <button onClick={() => setSubPage("applications")} style={{ padding: "0 18px", display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", cursor: "pointer", borderRight: `1px solid ${C.rule}` }}>
            <M style={{ fontSize: 11, color: C.body, letterSpacing: "0.06em" }}>MY APPLICATIONS</M>
            {pendingCount > 0 && <span style={{ background: C.amber, color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", letterSpacing: "0.04em" }}>{pendingCount}</span>}
          </button>
          {/* Profile */}
          <button onClick={() => setSubPage("profile")} style={{ padding: "0 18px", display: "flex", alignItems: "center", gap: 10, background: "transparent", border: "none", cursor: "pointer" }}>
            <div style={{ width: 32, height: 32, border: `1px solid ${C.rule}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🧑‍💻</div>
            <M style={{ fontSize: 11, color: C.body }}>{profile.name.split(" ")[0]}</M>
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="app-layout" style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* SIDEBAR */}
        <div className="app-sidebar" style={{ width: 300, borderRight: `1px solid ${C.rule}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0, background: C.bg }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.rule}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>{mode === "BUILD" ? "PROJECTS" : "ACTIVITIES"}</M>
              <M style={{ fontSize: 10, color: C.lime, fontWeight: 600 }}>{filtered.length} FOUND</M>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {["ALL", "YOURS"].map(f => <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "6px", fontSize: 10, letterSpacing: "0.08em", border: `1px solid ${C.rule}`, background: filter === f ? C.ink : "transparent", color: filter === f ? C.bg : C.muted, cursor: "pointer", transition: "all 0.1s" }}>{f}</button>)}
            </div>
            <button onClick={() => setShowPost(true)} style={{ width: "100%", padding: "9px", fontSize: 11, letterSpacing: "0.1em", fontWeight: 700, background: C.lime, color: C.limeInk, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              + POST {mode === "BUILD" ? "PROJECT" : "ACTIVITY"}
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 && <div style={{ padding: "40px 20px", textAlign: "center" }}><M style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>No {mode === "BUILD" ? "projects" : "activities"} yet.<br />Post one to get started.</M></div>}
            {filtered.map(item => {
              const isSel = selectedId === item.id;
              const open = item.roles?.filter(r => !r.filled).length ?? item.spots;
              const fill = item.roles?.filter(r => r.filled).length ?? 0;
              const total = item.roles?.length ?? item.spots;
              const pct = total > 0 ? Math.round((fill / total) * 100) : 0;
              // check if user has applied to this item
              const applied = myApps.find(a => a.projectId === item.id);
              return (
                <div key={item.id} onClick={() => { setSelectedId(item.id); setTab(mode === "BUILD" ? "ROLES" : "SPOTS"); }}
                  style={{ padding: "16px 18px", borderLeft: isSel ? `3px solid ${C.lime}` : "3px solid transparent", borderBottom: `1px solid ${C.rule}`, cursor: "pointer", background: isSel ? C.surface : "transparent", transition: "background 0.1s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
                      <D size={17} color={isSel ? C.ink : C.body} style={{ flexShrink: 0 }}>{item.name}</D>
                      {item.yours && <M style={{ fontSize: 8, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}`, padding: "1px 6px", flexShrink: 0 }}>YOURS</M>}
                    </div>
                    <M style={{ fontSize: 13, fontWeight: 700, color: item.match > 90 ? C.lime : item.match > 75 ? "#aaaa00" : C.muted, flexShrink: 0, marginLeft: 8 }}>{item.match}%</M>
                  </div>
                  <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, marginBottom: 8 }}>{item.tagline}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: applied ? 6 : 0 }}>
                    <M style={{ fontSize: 9, color: C.muted, background: C.surface2, padding: "2px 7px" }}>{item.category}</M>
                    <div style={{ flex: 1, height: 3, background: C.rule }}><div style={{ height: "100%", width: `${pct}%`, background: C.lime, transition: "width 0.3s" }} /></div>
                    <M style={{ fontSize: 9, color: open > 0 ? C.lime : C.muted }}>{open} OPEN</M>
                  </div>
                  {/* Applied indicator in sidebar */}
                  {applied && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 3, height: 3, borderRadius: "50%", background: applied.status === "ACCEPTED" ? C.lime : applied.status === "REJECTED" ? C.red : C.amber }} />
                      <M style={{ fontSize: 9, color: applied.status === "ACCEPTED" ? C.limeDark : applied.status === "REJECTED" ? C.red : C.amber }}>
                        APPLIED · {applied.status}
                      </M>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.rule}`, background: C.surface }}>
            <M style={{ fontSize: 9, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>YOUR SKILLS</M>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{profile.skills.slice(0, 5).map(s => <M key={s} style={{ fontSize: 10, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}66`, padding: "2px 8px" }}>{s}</M>)}</div>
          </div>
        </div>

        {/* DETAIL PANEL */}
        {sel && (
          <div key={selectedId} className="fade-up" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.detail }}>
            <div style={{ padding: "28px 36px 0", borderBottom: `1px solid ${C.rule}`, background: C.detail }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
                    {sel.yours && <M style={{ fontSize: 10, background: C.limeLight, color: C.limeDark, border: `1px solid ${C.lime}`, padding: "3px 10px", letterSpacing: "0.08em" }}>YOUR PROJECT</M>}
                    {sel.stage && <M style={{ fontSize: 10, color: C.muted, border: `1px solid ${C.rule}`, padding: "3px 10px" }}>{sel.stage}</M>}
                    {sel.commitment && <M style={{ fontSize: 10, color: C.muted, border: `1px solid ${C.rule}`, padding: "3px 10px" }}>{sel.commitment}</M>}
                    {sel.type && <M style={{ fontSize: 10, color: C.muted, border: `1px solid ${C.rule}`, padding: "3px 10px" }}>{sel.type}</M>}
                    {/* Applied status badge in detail header */}
                    {(() => { const a = myApps.find(x => x.projectId === sel.id); return a ? <StatusBadge status={a.status} /> : null; })()}
                  </div>
                  <D size={52} style={{ display: "block", marginBottom: 10 }}>{sel.name}</D>
                  <p style={{ fontSize: 14, color: C.body, lineHeight: 1.65, maxWidth: 520 }}>{sel.tagline}</p>
                </div>
                <div style={{ border: `1px solid ${C.rule}`, padding: "18px 24px", background: C.surface, textAlign: "center", flexShrink: 0 }}>
                  <D size={52} color={sel.match > 90 ? C.lime : sel.match > 75 ? "#aaaa00" : C.muted} style={{ display: "block" }}>{sel.match}%</D>
                  <M style={{ fontSize: 9, color: C.muted, letterSpacing: "0.14em" }}>SKILL MATCH</M>
                </div>
              </div>
              <div style={{ display: "flex" }}>
                {(mode === "BUILD" ? ["ROLES", "TIMELINE", "INFO"] : ["SPOTS", "TIMELINE", "INFO"]).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{ padding: "11px 20px", fontSize: 11, letterSpacing: "0.1em", cursor: "pointer", color: tab === t ? C.ink : C.muted, background: "transparent", border: "none", borderBottom: tab === t ? `2px solid ${C.lime}` : "2px solid transparent", transition: "color 0.1s", userSelect: "none" }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>

              {(tab === "ROLES" || tab === "SPOTS") && (
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 40 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                      <M style={{ fontSize: 11, color: C.muted, letterSpacing: "0.1em" }}>{mode === "BUILD" ? "TEAM COMPOSITION" : "OPEN SPOTS"}</M>
                      {mode === "BUILD" && sel.roles && <M style={{ fontSize: 11, color: C.body }}>{filledRoles.length}/{sel.roles.length} filled</M>}
                    </div>
                    {mode === "BUILD" && sel.roles && <div style={{ height: 4, background: C.rule, borderRadius: 2, marginBottom: 24 }}><div style={{ height: "100%", width: `${(filledRoles.length / sel.roles.length) * 100}%`, background: C.lime, borderRadius: 2, transition: "width 0.4s" }} /></div>}
                    {mode === "BUILD" && sel.roles?.map((role, i) => {
                      const alreadyApplied = myApps.find(a => a.projectId === sel.id && a.roleTitle === role.title);
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "13px 0", borderBottom: `1px solid ${C.rule}` }}>
                          <div style={{ width: 8, height: 8, flexShrink: 0, marginTop: 4, background: role.filled ? C.lime : "transparent", border: role.filled ? "none" : `1px solid ${C.rule}` }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: role.filled ? C.muted : C.ink, textDecoration: role.filled ? "line-through" : "none", marginBottom: role.filled ? 3 : 6 }}>{role.title}</div>
                            {role.filled && <M style={{ fontSize: 11, color: C.lime, display: "block", marginBottom: 6 }}>→ {role.member}</M>}
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{role.skills?.map(s => <M key={s} style={{ fontSize: 9, color: C.muted, border: `1px solid ${C.rule}`, padding: "2px 6px" }}>{s}</M>)}</div>
                          </div>
                          {!role.filled && (
                            alreadyApplied
                              ? <StatusBadge status={alreadyApplied.status} />
                              : <M onClick={() => setRequestTarget({ project: sel, role })} style={{ fontSize: 10, color: C.lime, border: `1px solid ${C.lime}`, padding: "4px 12px", cursor: "pointer", letterSpacing: "0.06em", flexShrink: 0, marginTop: 2 }}>APPLY</M>
                          )}
                        </div>
                      );
                    })}
                    {mode === "CREW" && [...Array(sel.spots || 0)].map((_, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: `1px solid ${C.rule}` }}>
                        <div style={{ width: 8, height: 8, border: `1px solid ${C.rule}` }} />
                        <span style={{ fontSize: 13, color: C.body, flex: 1 }}>Open spot {i + 1}</span>
                        <M style={{ fontSize: 10, color: C.lime, border: `1px solid ${C.lime}`, padding: "4px 12px", cursor: "pointer" }}>JOIN</M>
                      </div>
                    ))}
                    {mode === "CREW" && sel.tags && <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>{sel.tags.map(t => <M key={t} style={{ fontSize: 10, color: C.muted, border: `1px solid ${C.rule}`, padding: "3px 9px" }}>{t}</M>)}</div>}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                    {/* Your application status block */}
                    {!sel.yours && (() => {
                      const a = myApps.find(x => x.projectId === sel.id);
                      if (a) return (
                        <div style={{ border: `1px solid ${a.status === "ACCEPTED" ? C.lime : a.status === "REJECTED" ? C.red + "55" : C.rule}`, padding: "22px", background: a.status === "ACCEPTED" ? C.limeLight : a.status === "REJECTED" ? C.redLight : C.surface }}>
                          <M style={{ fontSize: 10, color: a.status === "ACCEPTED" ? C.limeDark : a.status === "REJECTED" ? C.red : C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>YOUR APPLICATION</M>
                          <D size={18} style={{ display: "block", marginBottom: 6 }}>{a.roleTitle}</D>
                          <StatusBadge status={a.status} />
                          <p style={{ fontSize: 12, color: C.body, marginTop: 10, lineHeight: 1.5 }}>{a.status === "PENDING" ? "Under review — the founder will respond via Plork." : a.status === "ACCEPTED" ? "🎉 You've been accepted! Check your messages." : "Not a fit this time. Keep applying."}</p>
                          <button onClick={() => setSubPage("applications")} style={{ marginTop: 14, fontSize: 11, letterSpacing: "0.08em", padding: "8px 16px", border: `1px solid ${C.rule}`, background: "transparent", color: C.body, cursor: "pointer" }}>VIEW ALL APPLICATIONS →</button>
                        </div>
                      );
                      return (
                        <div style={{ border: `1px solid ${C.lime}`, padding: "22px", background: C.limeLight }}>
                          <M style={{ fontSize: 10, color: C.limeDark, letterSpacing: "0.12em", display: "block", marginBottom: 10 }}>{mode === "BUILD" ? "YOU FIT THIS ROLE" : "YOU CAN JOIN"}</M>
                          <p style={{ fontSize: 14, color: C.ink, marginBottom: 6 }}>{mode === "BUILD" ? `${openRoles.length} open role${openRoles.length !== 1 ? "s" : ""} match your skills` : `${sel.spots} spot${sel.spots !== 1 ? "s" : ""} open this term`}</p>
                          <p style={{ fontSize: 12, color: C.body, marginBottom: 20, lineHeight: 1.5 }}>{mode === "BUILD" ? "Your React + ML/AI skills fit the Backend Dev role" : "Your schedule overlaps for 3 terms"}</p>
                          <button onClick={() => { if (mode === "BUILD" && openRoles.length > 0) setRequestTarget({ project: sel, role: openRoles[0] }); }} style={{ width: "100%", padding: "12px", fontSize: 12, letterSpacing: "0.1em", fontWeight: 700, background: C.lime, color: C.limeInk, border: "none", cursor: "pointer" }}>{mode === "BUILD" ? "REQUEST TO JOIN →" : "EXPRESS INTEREST →"}</button>
                        </div>
                      );
                    })()}

                    {sel.yours && <>
                      <div style={{ border: `1px solid ${C.rule}`, padding: "22px", background: C.surface }}>
                        <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 10 }}>YOUR {mode === "BUILD" ? "PROJECT" : "ACTIVITY"}</M>
                        <p style={{ fontSize: 13, color: C.body, marginBottom: 16, lineHeight: 1.5 }}>{openRoles.length > 0 || sel.spots > 0 ? `${mode === "BUILD" ? openRoles.length : sel.spots} open ${mode === "BUILD" ? "role" : "spot"}${(mode === "BUILD" ? openRoles.length : sel.spots) !== 1 ? "s" : ""} — waiting for applicants.` : "Team is full!"}</p>
                        <button onClick={() => { setManageProject(sel); setSubPage("manage"); }} style={{ width: "100%", padding: "11px", fontSize: 11, letterSpacing: "0.08em", fontWeight: 600, background: "transparent", color: C.ink, border: `1px solid ${C.ink}`, cursor: "pointer" }}>MANAGE APPLICANTS</button>
                      </div>
                      {mode === "BUILD" && (
                        <div style={{ border: `1px solid ${C.rule}`, padding: "22px", background: C.surface }}>
                          <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.12em", display: "block", marginBottom: 14 }}>MOST COMPATIBLE USERS</M>
                          {[{ id: "u_002", name: "Priya Mehta", stream: "ECE 3B", match: 91, skills: ["Python", "ML/AI", "React"], terms: ["W25", "F25", "W26"] },
                          { id: "u_003", name: "Arjun Sharma", stream: "SE 2B", match: 86, skills: ["Node.js", "TypeScript"], terms: ["F25", "W26"] },
                          { id: "u_004", name: "Dana Kowalski", stream: "MTE 3A", match: 79, skills: ["PCB Design", "Embedded C"], terms: ["W25", "F25"] }].map((u, i) => {
                            const overlap = u.terms.filter(t => sel.terms?.overlap?.includes(t));
                            return (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.rule}` }}>
                                <div style={{ width: 30, height: 30, background: C.limeLight, border: `1px solid ${C.lime}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🧑‍💻</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                    <M style={{ fontSize: 12, color: C.ink, fontWeight: 600 }}>{u.name}</M>
                                    <M style={{ fontSize: 12, fontWeight: 700, color: u.match > 90 ? C.lime : u.match > 80 ? "#aaaa00" : C.muted }}>{u.match}%</M>
                                  </div>
                                  <M style={{ fontSize: 10, color: C.muted, display: "block", marginBottom: 4 }}>{u.stream}</M>
                                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 3 }}>{u.skills.map(s => <M key={s} style={{ fontSize: 9, color: C.limeDark, background: C.limeLight, border: `1px solid ${C.lime}55`, padding: "1px 6px" }}>{s}</M>)}</div>
                                  {overlap.length > 0 && <M style={{ fontSize: 9, color: C.muted }}>On campus: {overlap.join(", ")}</M>}
                                </div>
                                <button onClick={() => api.sendInvite(u.id, sel.id, openRoles[0]?.title)} style={{ fontSize: 10, letterSpacing: "0.06em", padding: "5px 12px", border: `1px solid ${C.ink}`, background: "transparent", color: C.ink, cursor: "pointer", flexShrink: 0 }}>INVITE</button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>}

                    <div>
                      <M style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 14 }}>DETAILS</M>
                      {[["CATEGORY", sel.category], ["STAGE/TYPE", sel.type || sel.stage], ["COMMITMENT", sel.commitment || sel.type || "—"]].map(([k, v]) => v && (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.rule}`, padding: "9px 0" }}>
                          <M style={{ fontSize: 11, color: C.muted }}>{k}</M>
                          <M style={{ fontSize: 11, color: C.body }}>{v}</M>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "TIMELINE" && (
                <div>
                  <p style={{ fontSize: 13, color: C.body, marginBottom: 24, lineHeight: 1.6 }}>When the full team is on campus at the same time — highlighted in green.</p>
                  <div style={{ display: "flex", gap: 24, marginBottom: 28 }}>
                    {[{ c: C.lime, l: "Overlap" }, { c: C.ink, l: "On campus" }, { c: C.rule, l: "On co-op" }].map(x => (
                      <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, background: x.c }} /><M style={{ fontSize: 11, color: C.body }}>{x.l}</M></div>
                    ))}
                  </div>
                  {[{ label: "YOU", terms: YOU_TERMS, you: true }, { label: "FOUNDER", terms: sel.terms?.founder || YOU_TERMS }, ...filledRoles.map((r, i) => ({ label: r.member.toUpperCase(), terms: ALL_TERMS.filter((_, j) => j % 2 === i % 2) }))].map((p, pi) => (
                    <div key={pi} style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 0", borderBottom: `1px solid ${C.rule}` }}>
                      <M style={{ width: 80, fontSize: 11, color: p.you ? C.lime : C.body, fontWeight: p.you ? "600" : "400" }}>{p.label}</M>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                        {ALL_TERMS.map(t => { const active = p.terms.includes(t), ov = active && YOU_TERMS.includes(t) && (sel.terms?.overlap || YOU_TERMS).includes(t); return <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: ov ? 24 : active ? 16 : 8, background: ov ? C.lime : active ? C.ink : C.rule, transition: "all 0.2s", boxShadow: ov ? `0 2px 6px ${C.lime}66` : "none" }} /><M style={{ fontSize: 8, color: ov ? C.limeDark : active ? C.body : C.muted }}>{t}</M></div>; })}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 20, padding: "13px 18px", border: `1px solid ${C.lime}66`, background: C.limeLight }}>
                    <M style={{ fontSize: 12, color: C.limeDark }}>✓ Full team overlaps: {(sel.terms?.overlap || []).join("  ·  ")}</M>
                  </div>
                </div>
              )}

              {tab === "INFO" && (
                <div style={{ maxWidth: 520 }}>
                  <M style={{ fontSize: 11, color: C.muted, letterSpacing: "0.1em", display: "block", marginBottom: 20 }}>PROJECT INFO</M>
                  {[["Name", sel.name], ["Tagline", sel.tagline], ["Category", sel.category], ["Stage", sel.stage || sel.type], ["Commitment", sel.commitment || "—"]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 24, borderBottom: `1px solid ${C.rule}`, padding: "11px 0" }}>
                      <M style={{ width: 140, fontSize: 11, color: C.muted, flexShrink: 0 }}>{k}</M>
                      <M style={{ fontSize: 12, color: C.ink, lineHeight: 1.5 }}>{v}</M>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [userId, setUserId] = useState(null);

  if (screen === "login") return <Login onBack={() => setScreen("landing")} onSuccess={(id) => { setUserId(id); setScreen("app"); }} />;
  if (screen === "onboarding") return <Onboarding onBack={() => setScreen("landing")} onComplete={(id) => { setUserId(id); setScreen("app"); }} />;
  if (screen === "app") return <MainApp userId={userId} />;
  return <Landing onLogin={() => setScreen("login")} onSignup={() => setScreen("onboarding")} />;
}