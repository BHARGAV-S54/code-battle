
# CODE Battle - Production Deployment Guide

## Overview
CODE Battle is a high-stakes competitive programming platform featuring real-time proctoring and Gemini-powered code evaluation. It is designed to be deployed on Render, Heroku, or any Node.js compatible host with a PostgreSQL database.

---

## 1. Environment Configuration
Set the following environment variables in your hosting dashboard (e.g., Render Environment Settings):

| Variable | Description | Requirement |
| :--- | :--- | :--- |
| `API_KEY` | Google Gemini AI API Key | **Mandatory** |
| `DATABASE_URL` | PostgreSQL Connection String | Mandatory for Production |
| `PORT` | Port for the server | Defaults to 3000 |

---

## 2. Database Integration (PostgreSQL)
The application automatically detects `DATABASE_URL` and switches to production mode.

### Automatic Initialization
The server executes an `initDb` function on startup. If your `DATABASE_URL` is valid, it will create the following tables automatically:
- `contest_state`: Manages start times and contest status.
- `teams`: Stores credentials, scores, and violation flags.
- `submissions`: Records every code attempt with AI feedback.
- `problems`: Persistent storage for the custom problem bank.

### Manual SQL Schema (Reference)
If you need to manually configure your database via `psql` or a tool like DBeaver:

```sql
CREATE TABLE contest_state (
    id INTEGER PRIMARY KEY,
    status TEXT DEFAULT 'LOCKED',
    start_time BIGINT,
    duration_minutes INTEGER DEFAULT 60
);

CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    total_score INTEGER DEFAULT 0,
    violations INTEGER DEFAULT 0,
    assigned_problem_id TEXT,
    last_submission_time BIGINT
);

CREATE TABLE submissions (
    id TEXT PRIMARY KEY,
    team_id TEXT REFERENCES teams(id),
    data JSONB NOT NULL
);

CREATE TABLE problems (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL
);

-- Default contest row
INSERT INTO contest_state (id, status, duration_minutes) 
VALUES (1, 'LOCKED', 60) 
ON CONFLICT (id) DO NOTHING;
```

---

## 3. Deployment Instructions (Render.com)
1. **Create Web Service**: Connect your GitHub repository.
2. **Build Command**: `npm install`
3. **Start Command**: `node server.js`
4. **Environment**: Add `API_KEY` and `DATABASE_URL`.
5. **Health Check**: Ensure the server is listening on `0.0.0.0` (Render handles this via the `PORT` env var).

---

## 4. Admin Management
- **Dashboard**: Log in as `admin` / `bhargav`.
- **System Setup**: Access the "System Setup" tab in the dashboard to view connection health and database details live.
- **Arena Reset**: Use the "Purge Arena" button to clear all session data for a new contest.
