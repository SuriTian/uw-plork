# 🟢 PLORK
### Find Your Ideal Team at Waterloo — for both Work and Play

> Built at a UWaterloo EngHacks 2026

Plork is a teammate-matching platform built specifically for UW engineering students. It has two modes: BUILD mode lets you post side projects with specific role slots, and CREW mode that lets you find partners for your side quest.

---

## The Problem

The co-op cycle kills side projects and sports teams alike. You find great people, build momentum, then half the team disappears on work term. Plork solves this by matching you based on skills, interests, and the terms you're actually on campus.
It also helps you to connect to like minded students in other engineering programs and cohorts, to collaborate on cool projects and startup ideas together.

---

## Features

### 🔐 UWaterloo-Only Authentication
- Sign up and log in exclusively with your `@uwaterloo.ca` email
- No outsiders — this is built for Waterloo engineers only
- Profile setup collects your discipline, term, skills, interests, and co-op schedule

### 🔨 WORK Mode
Find or post side projects and startup ideas. Each listing has:
- Named role slots (e.g. "Firmware Engineer", "ML Engineer") with required skills
- Stage tracking: Idea → POC → Prototype → Scaling
- Commitment level: Casual / Serious / Startup
- Customize each rule with required skills

### 🏃 PLAY Mode
Find or post sports teams, music groups, and social activities. Each listing has:
- Open spots with a join button
- Allows you to pick a category, for example, sport, music, art, food, social, and gaming
- Activity type: Recreational / Competitive / One-time
- Edit the number of people needed

### 📊 Compatibility Scoring
When you browse listings, every post shows a **% match score** based on your profile. Listings are automatically sorted from most to least compatible so the best fits rise to the top.

### ✏️ Editable Profile
Update your skills, interests, discipline, term, co-op schedule, and commitment level at any time. Your match scores update accordingly.

---

## Algorithms

### Jaccard Similarity — Feed Compatibility Score
Used to rank all posts for a logged-in user on the feed page.

Jaccard measures the overlap between two sets:

```
score = |intersection| / |union|
```

These are combined into a final `compatibility_score` out of 100, and posts are sorted highest first.

**Why Jaccard?** It's symmetric, interpretable, and handles sets of different sizes fairly. A perfect skill match scores 100% regardless of how many extra skills you have.

### Gale-Shapley Inspired Ranking — Applicant Selection
Used by post owners to rank multiple applicants for their listing.

When a project receives multiple applications, the host needs to know who to pick first. We apply a Gale-Shapley inspired approach: each applicant is scored against the post's required skills using Jaccard, and applicants are returned ranked by `fit_score` from best to worst.

This gives the poster a stable, merit-based ordering — the applicant at the top is the strongest skill match for the role, making the decision straightforward.

**Why GS-inspired?** Classic Gale-Shapley solves mutual matching (both sides rank each other). Since our applicants don't pre-rank posts, we adapted the core insight — stable preference ordering — into a one-sided ranking that still produces a deterministic, fair result.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + CSS |
| Backend | Node.js + Express |
| Database | MySQL |
| Algorithm | Jaccard Similarity + Gale-Shapley Inspired Ranking |

---

## Deployment

The hosted demo runs on free tiers, which means the production backend uses an **in-memory SQLite database instead of persistent MySQL** — a real database, fully functional, it just resets whenever the free container restarts or goes idle. Local dev still uses real MySQL (see `.env.example`). Set `DB_DRIVER=sqlite` to run the ephemeral mode yourself.

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `POST` | `/users` | Create a new user |
| `GET` | `/users` | Get all users |
| `GET` | `/users/:id` | Get a single user |
| `POST` | `/posts` | Create a new listing |
| `GET` | `/posts` | Get all listings |
| `GET` | `/posts/:id` | Get a single listing |
| `GET` | `/feed/:user_id` | Get all listings ranked by compatibility for a user |
| `POST` | `/applications` | Apply to a listing |
| `GET` | `/applications/:post_id` | Get all applicants for a post |
| `GET` | `/applications/:post_id/ranked` | Get applicants ranked by skill fit (GS-inspired) |
| `PATCH` | `/applications/:id` | Accept or reject an applicant |

---

## Future Steps

- Implementing the uwaterloo email authentication
- switching colour pallette between the WORK mode and the PLAY mode
- Better compatibility score with Weighted Jaccard algorithm
