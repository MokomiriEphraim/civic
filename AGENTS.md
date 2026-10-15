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

- `server/index.ts` is the entire API: validation, rate limiting, JSON persistence, error handling. No routes directory, no DB layer.
- `src/types.ts` (`HazardReport`, `ReportStatus`, `HazardSeverity`) is shared by server and client — the server's `isHazardReport` validator is the source of truth for the shape; the client does not re-validate.
- `src/api/reports.ts` is the only HTTP client layer; report state, API error, and reload logic live in `src/App.tsx`. Route "navigation" is `activeView` state, not a router library.
- Path alias `@/` = repo root (configured in both `vite.config.ts` and `tsconfig.json`).
- `tsconfig.json` has no `include`/`exclude`, so `npm run lint` typechecks `src/`, `server/`, and `tests/`.

## Gotchas

- `*.ts.backup` / `*.tsx.backup` files sit next to real sources: stale, differ from current code, and are invisible to tsc/Vite. Never edit or copy from them; the `.ts`/`.tsx` file is the only source of truth.
- `data/reports.json` (gitignored) is created lazily on first write. The server caches reports in memory and serializes writes in-process (atomic temp-file + rename). Corrupt or invalid stored JSON returns 500 and is **not** reseeded automatically — don't "fix" it by deleting the file; that silently discards user data.
- Rate limit: 30 write requests (POST/PATCH) per client IP per minute per server process -> 429. It's in-memory only, so restarts reset it; `tests/api.test.ts` deliberately trips it, and a burst of UI status changes can too.
- Photos are base64 data URLs inside the report JSON (~14.5 MB cap per photo, 15 MB body limit -> 413). Not object storage.
- Report IDs (`#CF-#####`) are assigned server-side on POST; never generate them client-side.
- Enums are fixed: status = `Assigned | In Progress | Resolved | Rejected`, severity = `Low | Medium | High | Critical`. Server, client, and tests must stay in sync.
- `vite.config.ts` disables HMR and file watching when `DISABLE_HMR=true` (AI Studio agent environment). Do not modify that block.
- `@google/genai` in dependencies and `GEMINI_API_KEY`/`APP_URL` in `.env.example` are declared but unused — no Gemini/AI call exists in the code. Classification uses local presets in `src/data/mockReports.ts`.
- No CI workflows, no pre-commit hooks, no git repo metadata in this checkout — nothing runs the checks for you; run them yourself before claiming work is done.
