const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3000";

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
  return parsed;
};

export const api = {
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Login failed" }));
        throw new Error(errorData.error || "Invalid email or password");
      }
      const data = await response.json();
      return { userId: data.userId, user: parseJsonFields(data.user) };
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
          terms: formData.terms || [],
          commitment: formData.commitment,
          github: formData.github || "",
        }),
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Registration failed" }));
        throw new Error(errorData.error || "Registration failed");
      }
      // Get the created user to return ID
      const usersRes = await fetch(`${API_BASE}/users`);
      if (!usersRes.ok) throw new Error("Failed to fetch created user");
      const users = await usersRes.json();
      const user = users.find((u) => u.email === formData.email);
      if (!user) throw new Error("User not found after creation");
      return { userId: user.id, user: parseJsonFields(user) };
    } catch (error) {
      console.error("Error registering:", error);
      throw error;
    }
  },

  getProfile: async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch profile");
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
          terms: data.terms || [],
          built: data.built || "",
          commitment: data.commitment,
          github: data.github || "",
        }),
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Update failed" }));
        throw new Error(errorData.error || "Update failed");
      }
      const updated = await response.json();
      return parseJsonFields(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  },

  getProjects: async (mode, userId = null) => {
    try {
      const backendMode =
        mode === "WORK" ? "WORK" : mode === "PLAY" ? "PLAY" : "WORK";
      const url = userId
        ? `${API_BASE}/posts?userId=${userId}&mode=${backendMode}`
        : `${API_BASE}/posts?mode=${backendMode}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch posts");
      const posts = await response.json();
      return posts.map((post) => {
        const parsed = parseJsonFields(post);
        // Older posts created before roles were stored as structured JSON
        // only have a flat skills_needed array — fall back to reconstructing
        // generic role titles for those, but prefer the real stored roles.
        const skillsNeeded = parsed.skills_needed || [];
        const roles =
          parsed.roles && parsed.roles.length > 0
            ? parsed.roles
            : skillsNeeded.length > 0
              ? skillsNeeded.map((skill, idx) => ({
                  title: `Role ${idx + 1}`,
                  skills: Array.isArray(skill) ? skill : [skill],
                  filled: false,
                }))
              : [];

        return {
          id: parsed.id,
          name: parsed.title,
          tagline: parsed.description || "",
          category: parsed.category || "SOFTWARE",
          stage: parsed.stage || "IDEA",
          type: parsed.stage || "",
          tags: parsed.category ? [parsed.category] : [],
          match:
            parsed.compatibility_score !== null &&
            parsed.compatibility_score !== undefined
              ? parsed.compatibility_score
              : parsed.yours
                ? 100
                : 0,
          commitment: parsed.commitment || "SERIOUS",
          roles: roles,
          spots: parsed.spots || 1,
          terms: parsed.terms && !Array.isArray(parsed.terms)
            ? parsed.terms
            : { founder: [], overlap: [] },
          yours: parsed.yours || false,
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

      const roles = data.roles || [];
      const stage = data.stage || data.type || "";

      const response = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poster_id: userId,
          title: data.name,
          description: data.tagline || "",
          mode: data.mode === "PLAY" ? "PLAY" : "WORK",
          roles,
          category: data.category || "",
          stage,
          terms: data.terms || { founder: [], overlap: [] },
          commitment: data.commitment || null,
          spots: data.spots || 1,
          deadline: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to create post" }));
        throw new Error(
          errorData.error ||
            `Failed to create post: ${response.status} ${response.statusText}`,
        );
      }

      const created = parseJsonFields(await response.json());

      return {
        id: created.id,
        name: created.title,
        tagline: created.description || "",
        category: created.category || data.category || "SOFTWARE",
        stage: created.stage || stage || "IDEA",
        type: created.stage || stage || "",
        tags: created.category ? [created.category] : [],
        match: 100,
        commitment: created.commitment || data.commitment || "SERIOUS",
        roles: created.roles && created.roles.length > 0 ? created.roles : roles,
        spots: created.spots || data.spots || 1,
        terms: created.terms || data.terms || { founder: [], overlap: [] },
        yours: true,
        poster_name: created.poster_name,
        discipline: created.discipline,
        year: created.year,
      };
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  },

  submitApplication: async (postId, userId) => {
    try {
      const response = await fetch(`${API_BASE}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          applicant_id: userId,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit application");
      return await response.json();
    } catch (error) {
      console.error("Error submitting application:", error);
      throw error;
    }
  },

  getMyApplications: async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/applications/user/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch applications");
      return await response.json();
    } catch (error) {
      console.error("Error fetching applications:", error);
      return [];
    }
  },

  getApplicantsForPost: async (postId, mode = "WORK") => {
    try {
      const response = await fetch(
        `${API_BASE}/applications/${postId}?mode=${mode}`,
      );
      if (!response.ok) throw new Error("Failed to fetch applicants");
      return await response.json();
    } catch (error) {
      console.error("Error fetching applicants:", error);
      return [];
    }
  },

  getTopMatchesForPost: async (postId, mode = "WORK", limit = 20) => {
    try {
      const response = await fetch(
        `${API_BASE}/posts/${postId}/top-matches?mode=${mode}&limit=${limit}`,
      );
      if (!response.ok) throw new Error("Failed to fetch top matches");
      return await response.json();
    } catch (error) {
      console.error("Error fetching top matches:", error);
      return { post: "", matches: [] };
    }
  },
};
