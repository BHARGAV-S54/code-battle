
const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In production, Vite builds everything into the 'dist' folder
// including the index.html. We serve that folder as static.
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  // Fallback for development if dist doesn't exist yet
  app.use(express.static(__dirname));
}

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

app.get('/api/state', async (req, res) => {
  try {
    if (isProd && pool) {
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
      const DB_FILE = path.join(__dirname, 'data.json');
      let data = { teams: [], contest: { status: 'LOCKED', durationMinutes: 60, problemBank: [] }, submissions: [] };
      if (fs.existsSync(DB_FILE)) {
        data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      }
      return res.json(data);
    }
  } catch (err) {
    console.error("State sync failed:", err);
    return res.status(500).json({ error: 'Internal Database Sync Error' });
  }
});

// Capture-all route to serve the built index.html from dist
app.get('*', (req, res) => {
  const productionIndex = path.join(distPath, 'index.html');
  if (fs.existsSync(productionIndex)) {
    res.sendFile(productionIndex);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CODE Battle Production Server running at port ${PORT}`);
});
