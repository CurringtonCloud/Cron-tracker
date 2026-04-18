# Cron Dependency Tracker

Track cron job dependencies and find safe maintenance windows.

---

## Setup

### 1. Create your `.env` file

```bash
cp .env.example .env
```

Edit `.env` and set a strong API key. You can generate one with:

```bash
openssl rand -hex 32
```

Your `.env` should look like:

```
API_KEY=a1b2c3d4e5f6...
```

> `.env` is listed in `.gitignore` and `.dockerignore` — it will never be committed or baked into the image.

---

### 2. Start with Docker Compose

```bash
docker compose up -d
```

App runs at **http://localhost:3000** (bound to localhost only — not exposed on your network).

When you open the app in a browser, you'll be prompted for the API key once per session.

---

## Storage options

### Named Docker volume (default)
Data lives inside Docker, managed automatically.

```bash
docker compose up -d
```

### Bind mount to a host directory
Data stored on your filesystem — easy to back up or inspect.

Edit `docker-compose.yml`:

```yaml
volumes:
  - /your/host/path:/data
```

Or with plain `docker run`:

```bash
docker run -d \
  --name cron-tracker \
  -p 127.0.0.1:3000:3000 \
  -e API_KEY=your-secret-here \
  -v /your/host/path:/data \
  cron-tracker
```

---

## Environment variables

| Variable   | Default  | Required | Description                          |
|------------|----------|----------|--------------------------------------|
| `API_KEY`  | —        | Yes      | Secret key for API authentication    |
| `PORT`     | `3000`   | No       | HTTP port the server listens on      |
| `DATA_DIR` | `/data`  | No       | Directory where `jobs.json` is saved |

---

## Security overview

| Item | What was done |
|------|--------------|
| Authentication | Every API request requires `x-api-key` header matching `API_KEY` |
| Input validation | Names, cron expressions, timezones, and dependencies are validated server-side |
| Rate limiting | 100 requests/minute per IP; returns 429 if exceeded |
| Non-root container | App runs as `appuser` inside the container, not root |
| Localhost binding | Port mapped as `127.0.0.1:3000:3000` — not reachable from other machines |
| Secrets management | API key passed via environment variable, never baked into the image |
| Safe writes | `jobs.json` written atomically via a `.tmp` file + rename |

---

## Data management

```bash
# View stored jobs
docker exec cron-tracker cat /data/jobs.json

# Backup jobs to host
docker cp cron-tracker:/data/jobs.json ./jobs-backup.json

# Restore from backup
docker cp ./jobs-backup.json cron-tracker:/data/jobs.json
```

---

## Build

```bash
docker build -t cron-tracker .
```

---

## Health check

```
GET /health
→ { "status": "ok", "dataDir": "/data", "jobCount": 4 }
```

No API key required for the health endpoint.

---

## Updating

```bash
# Pull latest code changes, rebuild, and restart
git pull
docker compose up -d --build
```
