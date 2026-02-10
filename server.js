
const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

/**
 * PRODUCTION DATABASE SETUP
 */
const isProd = !!process.env.DATABASE_URL;
let pool = null;

if (isProd) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('Connected to PostgreSQL Production Database');

  // Automatic table initialization for production
  const initDb = async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS contest_state (
          id INTEGER PRIMARY KEY,
          status TEXT DEFAULT 'LOCKED',
          start_time BIGINT,
          duration_minutes INTEGER DEFAULT 60
        );
        CREATE TABLE IF NOT EXISTS problems (
          id TEXT PRIMARY KEY,
          data JSONB
        );
        CREATE TABLE IF NOT EXISTS teams (
          id TEXT PRIMARY KEY,
          name TEXT,
          password TEXT,
          total_score INTEGER DEFAULT 0,
          violations INTEGER DEFAULT 0,
          assigned_problem_id TEXT,
          last_submission_time BIGINT
        );
        CREATE TABLE IF NOT EXISTS submissions (
          id TEXT PRIMARY KEY,
          team_id TEXT,
          data JSONB
        );
        INSERT INTO contest_state (id, status, duration_minutes) 
        VALUES (1, 'LOCKED', 60) 
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('Database tables initialized');
    } catch (err) {
      console.error('Database initialization failed:', err);
    }
  };
  initDb();
}

// Initial Mock State for Local Development
let localDb = {
  teams: [],
  contest: { status: 'LOCKED', durationMinutes: 60, problemBank: [] },
  submissions: []
};

const DB_FILE = path.join(__dirname, 'data.json');
if (!isProd && fs.existsSync(DB_FILE)) {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    if (data.trim()) localDb = JSON.parse(data);
  } catch (e) { 
    console.error("Local DB read error:", e); 
  }
}

const saveLocalDb = () => {
  if (!isProd) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(localDb, null, 2));
    } catch (e) {
      console.error("Local DB save error:", e);
    }
  }
};

// API: Get Full State
app.get('/api/state', async (req, res) => {
  try {
    if (isProd) {
      const teamsRes = await pool.query('SELECT * FROM teams');
      const submissionsRes = await pool.query('SELECT data FROM submissions');
      const contestRes = await pool.query('SELECT * FROM contest_state WHERE id = 1');
      const problemsRes = await pool.query('SELECT data FROM problems');

      const contestData = contestRes.rows[0] || { status: 'LOCKED', duration_minutes: 60 };
      
      return res.json({
        teams: teamsRes.rows.map(t => ({
          ...t,
          totalScore: t.total_score,
          lastSubmissionTime: t.last_submission_time ? parseInt(t.last_submission_time) : null,
          assignedProblemId: t.assigned_problem_id,
          violations: t.violations || 0
        })),
        submissions: submissionsRes.rows.map(r => r.data),
        contest: {
          status: contestData.status,
          startTime: contestData.start_time ? parseInt(contestData.start_time) : undefined,
          durationMinutes: contestData.duration_minutes,
          problemBank: problemsRes.rows.map(r => r.data)
        }
      });
    } else {
      return res.json(localDb);
    }
  } catch (err) {
    console.error("State sync failed:", err);
    return res.status(500).json({ error: 'Internal Database Sync Error' });
  }
});

// API: Create/Update Team
app.post('/api/teams', async (req, res) => {
  const team = req.body;
  try {
    if (isProd) {
      await pool.query(
        'INSERT INTO teams (id, name, password, total_score, violations, assigned_problem_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name = $2, password = $3, assigned_problem_id = $6, violations = $5',
        [team.id, team.name, team.password, team.totalScore || 0, team.violations || 0, team.assignedProblemId || null]
      );
    } else {
      localDb.teams = localDb.teams.filter(t => t.id !== team.id);
      localDb.teams.push(team);
      saveLocalDb();
    }
    return res.status(201).json(team);
  } catch (err) {
    console.error("Team save failed:", err);
    return res.status(500).json({ error: 'Failed to save team' });
  }
});

// API: Delete Team
app.delete('/api/teams/:id', async (req, res) => {
  try {
    if (isProd) {
      await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    } else {
      localDb.teams = localDb.teams.filter(t => t.id !== req.params.id);
      saveLocalDb();
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Team deletion failed:", err);
    return res.status(500).json({ error: 'Deletion failed' });
  }
});

// API: Start/Update Contest
app.post('/api/contest', async (req, res) => {
  const { status, startTime, durationMinutes } = req.body;
  try {
    if (isProd) {
      await pool.query(
        'INSERT INTO contest_state (id, status, start_time, duration_minutes) VALUES (1, $1, $2, $3) ON CONFLICT (id) DO UPDATE SET status = $1, start_time = $2, duration_minutes = $3',
        [status, startTime || null, durationMinutes]
      );
    } else {
      localDb.contest = { ...localDb.contest, ...req.body };
      saveLocalDb();
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Contest update failed:", err);
    return res.status(500).json({ error: 'Contest update failed' });
  }
});

// API: Problem Bank Management
app.post('/api/problems', async (req, res) => {
  const problem = req.body;
  try {
    if (isProd) {
      await pool.query(
        'INSERT INTO problems (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2',
        [problem.id, JSON.stringify(problem)]
      );
    } else {
      localDb.contest.problemBank = localDb.contest.problemBank.filter(p => p.id !== problem.id);
      localDb.contest.problemBank.push(problem);
      saveLocalDb();
    }
    return res.status(201).json(problem);
  } catch (err) {
    console.error("Problem save failed:", err);
    return res.status(500).json({ error: 'Failed to save problem' });
  }
});

app.delete('/api/problems/:id', async (req, res) => {
  try {
    if (isProd) {
      await pool.query('DELETE FROM problems WHERE id = $1', [req.params.id]);
    } else {
      localDb.contest.problemBank = localDb.contest.problemBank.filter(p => p.id !== req.params.id);
      saveLocalDb();
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Problem deletion failed:", err);
    return res.status(500).json({ error: 'Problem deletion failed' });
  }
});

// API: Submit Code
app.post('/api/submissions', async (req, res) => {
  const sub = req.body;
  try {
    if (isProd) {
      await pool.query('INSERT INTO submissions (id, team_id, data) VALUES ($1, $2, $3)', [sub.id, sub.teamId, JSON.stringify(sub)]);
      await pool.query(
        'UPDATE teams SET total_score = GREATEST(total_score, $1), last_submission_time = $2 WHERE id = $3',
        [sub.score, sub.timestamp, sub.teamId]
      );
    } else {
      localDb.submissions.push(sub);
      const t = localDb.teams.find(team => team.id === sub.teamId);
      if (t) {
        t.totalScore = Math.max(t.totalScore, sub.score);
        t.lastSubmissionTime = sub.timestamp;
      }
      saveLocalDb();
    }
    return res.status(201).json(sub);
  } catch (err) {
    console.error("Submission failed:", err);
    return res.status(500).json({ error: 'Submission failed' });
  }
});

// API: Log Violation
app.post('/api/violations/:teamId', async (req, res) => {
  try {
    if (isProd) {
      await pool.query('UPDATE teams SET violations = violations + 1 WHERE id = $1', [req.params.teamId]);
    } else {
      const t = localDb.teams.find(team => team.id === req.params.teamId);
      if (t) t.violations = (t.violations || 0) + 1;
      saveLocalDb();
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Violation logging failed:", err);
    return res.status(500).json({ error: 'Violation log failed' });
  }
});

// API: Reset Arena
app.post('/api/reset', async (req, res) => {
  try {
    if (isProd) {
      await pool.query('DELETE FROM submissions');
      await pool.query('DELETE FROM teams');
      await pool.query('UPDATE contest_state SET status = \'LOCKED\', start_time = NULL WHERE id = 1');
    } else {
      localDb = { 
        teams: [], 
        contest: { status: 'LOCKED', durationMinutes: 60, problemBank: localDb.contest.problemBank }, 
        submissions: [] 
      };
      saveLocalDb();
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Arena reset failed:", err);
    return res.status(500).json({ error: 'Reset failed' });
  }
});

// SPA Fallback: Support SPA routing by serving index.html for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CODE Battle Production Server running at port ${PORT}`);
});
