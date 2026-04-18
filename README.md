# Cron Dependency Tracker

Track cron job dependencies and find safe maintenance windows.

## Quick start

### Option A — Docker Compose (recommended)

```bash
docker compose up -d
```

App runs at http://localhost:3000. Data persists in a named Docker volume (`cron-data`).

---

### Option B — Map to a host directory

If you want the data stored on your host machine (easy to back up or inspect):

```bash
docker compose -f docker-compose.yml run --rm \
  -v /your/host/path:/data \
  cron-tracker
```

Or edit `docker-compose.yml` and replace the volume with a bind mount:

```yaml
volumes:
  - /your/host/path:/data
```

---

### Option C — Plain Docker run

```bash
# With a named volume
docker run -d \
  --name cron-tracker \
  -p 3000:3000 \
  -v cron-data:/data \
  cron-tracker

# With a host directory bind mount
docker run -d \
  --name cron-tracker \
  -p 3000:3000 \
  -v /your/host/path:/data \
  cron-tracker
```

---

## Environment variables

| Variable   | Default  | Description                        |
|------------|----------|------------------------------------|
| `PORT`     | `3000`   | HTTP port the server listens on    |
| `DATA_DIR` | `/data`  | Directory where `jobs.json` is stored |

---

## Data storage

Jobs are stored as plain JSON at `$DATA_DIR/jobs.json`. You can inspect, edit, or back it up directly:

```bash
# View stored jobs (named volume)
docker exec cron-tracker cat /data/jobs.json

# Copy jobs.json to your host
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
