# CivicFix

CivicFix is a React/Vite frontend with an Express API. In local development the API persists reports to `data/reports.json`; keep that file backed up, and do not commit real report data.

## Run locally

Install dependencies once:

```powershell
npm install
```

Run the API and frontend in separate terminals from the project directory:

```powershell
npm run dev:api
```

```powershell
npm run dev
```

Open `http://localhost:3000`. Vite forwards `/api` requests to the API at `http://localhost:3001`. Check API availability at `http://localhost:3001/api/health`.

The API uses `API_PORT` and `REPORTS_FILE` from the environment. Defaults are port `3001` and `data/reports.json`; see `.env.example`. The report JSON file is excluded from Git so locally collected data is not accidentally committed.

## API

- `GET /api/health`
- `GET /api/reports`
- `GET /api/reports/:id`
- `POST /api/reports`
- `PATCH /api/reports/:id/status`

New report IDs are assigned by the server. Status changes and report creation are written to storage before the API responds. Invalid stored JSON or storage errors return an API error and do not trigger automatic reseeding.
Write requests are limited to 30 per client IP per minute in the running process. This is a basic local safeguard, not a substitute for a production gateway or distributed rate limiter.

## Current limitations

- JSON-file persistence is intended for local development and a single API process. Writes are serialized only within that process; concurrent server processes, multiple machines, backups, and recovery are not coordinated. Use PostgreSQL or another transactional database, with an explicit migration and backup plan, before a multi-user public deployment.
- The application has no authentication or authorization. In particular, the status endpoint is not restricted to municipal staff. Do not expose it publicly until roles and access control are implemented.
- Uploaded images are currently stored as data URLs inside the report JSON. This is size-limited but not a substitute for secure object storage, malware scanning, retention policies, or privacy controls.
- Classification and department suggestions use demo presets; no live image AI, geolocation, municipal dispatch, or municipal status feed is configured. Status changes in this app update CivicFix's local store only.
- The development frontend uses Vite's `/api` proxy. A deployment must configure a same-origin reverse proxy or an explicit, restrictive API origin policy, plus HTTPS, monitoring, backups, and operational alerting.

## Checks

```powershell
npm run lint
npm test
npm run build
```
