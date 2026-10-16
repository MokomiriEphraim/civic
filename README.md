# CivicFix

> **A closer view of city life.** City updates, community, and local services — together in one place.

![React 19](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.12-339933?logo=nodedotjs&logoColor=white)
![Vercel demo](https://img.shields.io/badge/deployment-Vercel%20demo-black?logo=vercel&logoColor=white)
![License not specified](https://img.shields.io/badge/license-not%20specified-lightgrey)

## About

CivicFix is a civic engagement platform concept that brings everyday city information and resident services into one accessible experience. Instead of focusing only on reporting problems, it gives residents one place to explore local updates and community activity, and to submit and follow up on service reports. Demo operations and field-work views help illustrate how teams could review reports and coordinate responses.

Features include:

- A resident-facing city dashboard for civic updates, alerts, events, and community content.
- Service reports with photos, status tracking, confirmations, messages, and ratings.
- Demonstration operations and field-team views for reviewing the work queue.
- A React frontend and Express API, with local JSON-file storage or Supabase-backed persistence for a Vercel demo.

## Visual

![CivicFix landing page showing a city-service experience](./src/assets/images/civicfix_hero_landscape_1791996007184.jpg)

*The landing page uses a Cape Town-inspired city image and introduces CivicFix as a place for city life, community, and services.*

## Run locally

### Requirements

- Node.js 22.12 or newer
- npm

Install dependencies from the project directory:

```powershell
npm install
```

Start the API and frontend in separate terminals:

```powershell
npm run dev:api
```

```powershell
npm run dev
```

Open `http://localhost:3000`. Vite forwards `/api` requests to `http://localhost:3001`; check the API at `http://localhost:3001/api/health`.

The local API stores reports in `data/reports.json` by default. Configure `API_PORT` and `REPORTS_FILE` as needed; see [`.env.example`](./.env.example). The data directory is excluded from Git. Keep local data backed up, and do not commit real resident information.

## API

The API includes report and civic-collection endpoints. Core report routes:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check API availability |
| `GET` | `/api/reports` | List reports |
| `GET` | `/api/reports/:id` | Get a report |
| `POST` | `/api/reports` | Create a report; the server assigns its ID |
| `PATCH` | `/api/reports/:id/status` | Update report status |

Additional report routes support duplicate detection and per-ticket confirmations, resolutions, ratings, and messages. Civic collections are available under `/api/c/:name`.

## Deploy a demo to Vercel

Vercel function filesystems are temporary, so the deployed API requires Supabase persistence:

1. Create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL Editor.
2. Import the repository into Vercel. Use the configured Vite framework, `npm run build` build command, and `dist` output directory.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the Vercel Preview and Production environment settings. Keep the service-role key server-side; never expose it through a `VITE_` variable.
4. Deploy and verify `<deployment-url>/api/health`.

The API initializes report and collection seed data in Supabase when each document is first requested. Report images are compressed in the browser to fit the function request-size limit.

## Important limitations

**This is an unauthenticated demo, not an official municipal service.** There is no sign-in or authorization, and the demo role switcher is not access control. Public visitors can submit reports and use write-enabled endpoints, including status changes. Do not use real resident information or confidential municipal data.

- Local persistence uses JSON files. Vercel uses a Supabase JSON-document table with revision checks, intended for a small demo rather than high-volume operations.
- The in-memory write limit is per server process or function instance; it is not global abuse protection.
- Photos are stored as compressed data URLs in report documents. A production service would need managed object storage, privacy controls, and retention policies.
- Classification and department suggestions use demo presets. There is no live image-AI service, municipal dispatch integration, or municipal status feed.
- Before any public-service use, implement appropriate authentication, authorization, shared rate limiting, monitoring, backups, privacy controls, and operational recovery procedures.

## Checks

Run the project checks from the repository directory:

```powershell
npm run lint
npm test
npm run build
```

There is currently no CI workflow or automated coverage badge configured, so these badges are not presented as live build or coverage status.

## License

No open-source license is currently specified, and the repository does not include a `LICENSE` file. Until the project owner selects and adds a license, reuse and redistribution are not granted by this README.

## Acknowledgments

- Built with [React](https://react.dev/), [Vite](https://vite.dev/), and [Express](https://expressjs.com/).
- Optional hosted demo persistence is provided by [Supabase](https://supabase.com/).
- Interface icons are provided by [Lucide](https://lucide.dev/).
