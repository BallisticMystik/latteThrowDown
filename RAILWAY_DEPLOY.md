# Railway Deployment Guide

## Project: barista-spotlight

Your app is deployed on Railway with the following setup:

### Services
- **Bun** – Your Barista Spotlight app (Hono + React)
- **Postgres** / **Postgres-7ZQo** – PostgreSQL databases (from templates)

### Live URL
- **App**: https://bun-production-6a1c.up.railway.app

### Deploy to the Correct Service

**Important:** Always deploy to the **Bun** service (not Postgres):

```bash
railway up --service Bun
```

Or via Railway MCP: use `deploy` with `service: "Bun"`.

### SQLite + Persistent Storage

The app uses **SQLite** for the database. For data to persist across deployments, add a **Volume** to the **Bun** service:

1. Open [Railway Dashboard](https://railway.com/project/69e2ac4a-65f7-4904-8a53-479a95335724)
2. Select the **Bun** service
3. Go to **Settings** → **Volumes**
4. Click **Add Volume**
5. Set **Mount Path** to `/data`
6. Redeploy the service

The app stores the SQLite database at `$RAILWAY_VOLUME_MOUNT_PATH/barista-spotlight.db` (or `/data/barista-spotlight.db` when `DB_PATH` is set).

### Environment Variables (Bun service)

- `DB_PATH` – `/data/barista-spotlight.db` (when using a volume)
- `PORT` – Set automatically by Railway
- `RAILWAY_VOLUME_MOUNT_PATH` – Set automatically when a volume is attached
- `RAILWAY_PUBLIC_DOMAIN` – Set automatically for CORS
