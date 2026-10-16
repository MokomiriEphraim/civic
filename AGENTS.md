# AGENTS.md

Single-package app (not a monorepo): React 19 + Vite frontend, Express API in the same npm project. `README.md` has setup/API docs (examples are PowerShell) — trust this file and the scripts/config over README prose where they differ.

## Commands (verified)

```sh
npm install          # no lockfile is committed; run once before anything
npm run lint         # = tsc --noEmit only (no ESLint/Prettier/formatter exists)
npm test             # = tsx --test tests/*.test.ts (shell expands the glob)
npm run build        # = vite build -> dist/ (gitignored)
```

Check order: `npm run lint` -> `npm test` -> `npm run build`. All three pass on a clean checkout.

Focused test runs:

```sh
npx tsx --test tests/api.test.ts
npx tsx --test --test-name-pattern="dashboard" tests/*.test.ts
```

Dev requires **two processes** in separate terminals:

```sh
npm run dev:api      # Express via tsx watch, port 3001
npm run dev          # Vite on http://localhost:3000
```

The UI only reaches the API through Vite's `/api` proxy -> `http://localhost:3001` (`vite.config.ts`). Running the frontend alone yields a "Could not load reports" banner, not a crash. Health check: `http://localhost:3001/api/health`.

## Architecture

- `server/index.ts` is the HTTP surface (rate limiting, validation, error handling) over three modules: `server/validation.ts` (`isHazardReport`, `validateShape`/`Shape`), `server/store.ts` (`JsonStore` — cached JSON file, in-process write queue, atomic rename), `server/collections.ts` (collection configs + `createStores` + `/api/c` router). No DB layer.
- Report API: `GET/POST /api/reports`, `GET /api/reports/:id`, `PATCH .../status` (applies `applyStatusToTimeline`), `POST /api/reports/detect-duplicates`, and per-ticket `GET/POST .../engagement|confirm`, `GET/PUT/PATCH .../resolution`, `GET/POST .../rating`, `GET/POST .../messages`. POST create runs `dispatchTeam` and appends an `Auto-dispatched` timeline stage.
- Collections API: `GET/POST /api/c/:name`, `PATCH/DELETE /api/c/:name/:id` for `alerts, announcements, discussions, polls, events, documents, projects` plus ticket-keyed `threads, engagements, resolutions, ratings` (those four use the ticket id as their record id; their `id` must be supplied on POST). Static bundled photos are served at `/api/assets/<file>` from `src/assets/images/`.
- Seeding: when `data/reports.json` is missing, reports are seeded from `src/data/seedReports.ts` (`SEED_REPORTS`); each collection file under `data/collections/` is seeded when missing from `src/data/seed.ts` / `src/data/seedReports.ts`. `CIVIC_SEED=0|false|no|off` disables all seeding — `tests/api.test.ts` sets it, the other API suites rely on seeding.
- `src/types.ts` is shared by server and client: all domain types, plus runtime arrays `REPORT_STATUSES`, `OPEN_STATUSES`, `HAZARD_SEVERITIES`, `ALERT_CATEGORIES`, `COMMUNITY_CATEGORIES`. The server's `isHazardReport`/`validateShape` are the source of truth for shapes; the client does not re-validate.
- HTTP clients: `src/api/request.ts` (shared fetch wrapper that throws `Error(server.error)`), `src/api/reports.ts` (reports + ticket extras), `src/api/collections.ts` (collection CRUD + `loadCollections()`).
- Pure logic lives in `src/utils/` (`dates`, `proximity`, `duplicate`, `priority`, `dispatch`, `hazardTaxonomy`, `hazardVision` + `src/data/teams.ts`, `stats`, `assistant`, `timeline`). Local vision inference runs in `src/workers/hazardVision.worker.ts`; it is not a server-side model call.
- UI: `src/App.tsx` owns report state, collections, the `role` demo switcher (`UserRole`, persisted in localStorage) and view routing (`activeView` state, no router). Each screen is one component in `src/components/` (`HomeView`, `CivicMapView`, `TransparencyView`, `TicketView`, `CommunityView`, `BulletinsView`, `DiscoverView`, `OpsView`, `WorkerView`, plus `DashboardView`, `ReportWizard`, `LandingView`); shared badges/cards in `src/components/ui.tsx`; `AssistantDock` is the floating local assistant.
- Path alias `@/` = repo root (configured in both `vite.config.ts` and `tsconfig.json`).
- `tsconfig.json` has no `include`/`exclude`, so `npm run lint` typechecks `src/`, `server/`, and `tests/`.

## Gotchas

- `*.ts.backup` / `*.tsx.backup` files sit next to real sources: stale, differ from current code, and are invisible to tsc/Vite. Never edit or copy from them; the `.ts`/`.tsx` file is the only source of truth.
- `data/reports.json` (gitignored) is created lazily on first write. The server caches reports in memory and serializes writes in-process (atomic temp-file + rename). Corrupt or invalid stored JSON returns 500 and is **not** reseeded automatically — don't "fix" it by deleting the file; that silently discards user data.
- Rate limit: 30 write requests (POST/PATCH/PUT/DELETE) per client IP per minute per server process -> 429. It's in-memory only, so restarts reset it; `tests/api.test.ts` deliberately trips it, and a burst of UI status changes can too.
- `data/collections/*.json` is gitignored like `data/reports.json`; runtime demo content (votes, comments, confirmations) persists there locally.
- API tests spawn `server/index.ts` via `tests/helpers.ts` (`startApi`), on ephemeral ports with a temp `REPORTS_FILE`. Only `tests/api.test.ts` opts out of seeding; the collections/report-extras suites assert against seed data, so editing `src/data/seed*.ts` may require updating `tests/collections.test.ts` / `tests/reportExtras.test.ts`.
- Photos are base64 data URLs inside the report JSON (~14.5 MB cap per photo, 15 MB body limit -> 413). Not object storage.
- Report IDs (`#CF-#####`) are assigned server-side on POST; never generate them client-side.
- Enums are fixed: status = `Received | Verified | Assigned | In Progress | Resolved | Rejected` (use `REPORT_STATUSES`/`OPEN_STATUSES`, don't hardcode lists), severity = `Low | Medium | High | Critical`. Server, client, seeds, and tests must stay in sync.
- `vite.config.ts` disables HMR and file watching when `DISABLE_HMR=true` (AI Studio agent environment). Do not modify that block.
- Report photos are classified in the browser with a pinned, quantized Transformers.js CLIP model. The image is not sent to the model host; model files are downloaded from Hugging Face. AI output is advisory, scores are not calibrated confidence, and residents confirm or edit the suggestion. There is no Gemini integration or AI API key.
- No CI workflows and no pre-commit hooks — nothing runs the checks for you; run lint/test/build yourself before claiming work is done. Commit with the existing history (`git log` style: short lowercase subjects like `backend`, `feat: ...`).
