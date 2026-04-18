const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_FILE = path.join(DATA_DIR, 'jobs.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJobs() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return []; }
}

function writeJobs(jobs) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(jobs, null, 2));
}

app.get('/api/jobs', (req, res) => {
  res.json(readJobs());
});

app.post('/api/jobs', (req, res) => {
  const { name, cron, tz, deps } = req.body;
  if (!name || !cron || !deps?.length) return res.status(400).json({ error: 'Missing required fields' });
  const jobs = readJobs();
  const id = jobs.reduce((m, j) => Math.max(m, j.id), 0) + 1;
  const job = { id, name, cron, tz: tz || 'UTC', deps };
  jobs.push(job);
  writeJobs(jobs);
  res.status(201).json(job);
});

app.delete('/api/jobs/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const jobs = readJobs().filter(j => j.id !== id);
  writeJobs(jobs);
  res.json({ ok: true });
});

app.get('/health', (req, res) => res.json({ status: 'ok', dataDir: DATA_DIR, jobCount: readJobs().length }));

app.listen(PORT, () => console.log(`Cron Tracker running on http://localhost:${PORT} | Data: ${DATA_DIR}`));
