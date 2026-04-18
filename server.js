const express = require('express');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_FILE = path.join(DATA_DIR, 'jobs.json');
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('FATAL: API_KEY environment variable is not set. Refusing to start.');
  process.exit(1);
}

// ── Validation helpers ────────────────────────────────────────────────────────

const VALID_CRON = /^(\*|[0-9*\/,-]+)\s+(\*|[0-9*\/,-]+)\s+(\*|[0-9*\/,-]+)\s+(\*|[0-9*\/,-]+)\s+(\*|[0-9*\/,-]+)$/;
const VALID_NAME = /^[a-zA-Z0-9_\-. ]{1,64}$/;
const VALID_DEP  = /^[a-zA-Z0-9_\-. ]{1,64}$/;

const ALLOWED_TZ = new Set([
  'UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'America/Sao_Paulo','Europe/London','Europe/Paris','Europe/Berlin','Europe/Moscow',
  'Asia/Dubai','Asia/Kolkata','Asia/Bangkok','Asia/Shanghai','Asia/Tokyo',
  'Australia/Sydney','Pacific/Auckland'
]);

function validateJob({ name, cron, tz, deps }) {
  if (!name || !VALID_NAME.test(name))
    return 'Invalid name: 1–64 alphanumeric characters, hyphens, underscores, dots, or spaces.';
  if (!cron || !VALID_CRON.test(cron.trim()))
    return 'Invalid cron expression.';
  if (tz && !ALLOWED_TZ.has(tz))
    return 'Unsupported timezone.';
  if (!Array.isArray(deps) || deps.length === 0 || deps.length > 20)
    return 'deps must be a non-empty array with at most 20 entries.';
  for (const d of deps) {
    if (typeof d !== 'string' || !VALID_DEP.test(d))
      return `Invalid dependency name: "${d}". Use 1–64 alphanumeric characters, hyphens, underscores, dots, or spaces.`;
  }
  return null;
}

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '16kb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});
app.use(limiter);

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing API key.' });
  }
  next();
}

app.use(express.static(path.join(__dirname, 'static')));

// ── Storage ───────────────────────────────────────────────────────────────────

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
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(jobs, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/jobs', requireApiKey, (req, res) => {
  res.json(readJobs());
});

app.post('/api/jobs', requireApiKey, (req, res) => {
  const { name, cron, tz, deps } = req.body;
  const err = validateJob({ name, cron, tz, deps });
  if (err) return res.status(400).json({ error: err });

  const jobs = readJobs();
  const id = jobs.reduce((m, j) => Math.max(m, j.id), 0) + 1;
  const job = {
    id,
    name: name.trim(),
    cron: cron.trim(),
    tz: tz || 'UTC',
    deps: deps.map(d => d.trim().toLowerCase())
  };
  jobs.push(job);
  writeJobs(jobs);
  res.status(201).json(job);
});

app.delete('/api/jobs/:id', requireApiKey, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id.' });
  const jobs = readJobs().filter(j => j.id !== id);
  writeJobs(jobs);
  res.json({ ok: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', dataDir: DATA_DIR, jobCount: readJobs().length });
});

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

app.listen(PORT, '0.0.0.0', () =>
  console.log(`Cron Tracker running on port ${PORT} | Data: ${DATA_DIR}`)
);
