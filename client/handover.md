# SignalDesk — Project Handover

## Project overview
SignalDesk is an AI-powered customer feedback intelligence SaaS built with React, Vite, Express, PostgreSQL, and an OpenAI-compatible API.

## Repository
https://github.com/saksham25bcs10283-cyber/MERN-Final-project-SignalDesk-

## Architecture
- Frontend: client/
- Backend: server/
- Database: Supabase PostgreSQL
- Backend tests: server/test/api.test.js
- AI classification: server/src/services/ai.js
- Classification endpoint: POST /api/feedback/:id/classify

## Completed milestones
1. UI foundation (Commit 1: `ec3d267`)
2. Express API and PostgreSQL schema (Commit 2: `9f66fb4`)
3. Persistent feedback CRUD (Commit 3: `ada4362`)
4. AI-powered feedback classification (Commit 4: `a67cb8e` merged to main)
5. Evidence-backed insights (Milestone 5)

## Milestone 5 — Evidence-Backed Insights
- Deterministic aggregation service: `server/src/services/insights.js`
- Insights API router: `server/src/routes/insights.js` (`GET /api/insights`, `POST /api/insights/generate`, `GET /api/insights/:id`, `DELETE /api/insights/:id`)
- Idempotent generation with PostgreSQL transaction isolation (`pg_advisory_xact_lock` and title-based sync).
- Schema integrity: strictly reuses existing `insights` and `insight_feedback` tables without altering or inventing columns.
- Evidence linking: real customer feedback records linked via `insight_feedback`, displaying verbatim customer quotes, feedback IDs (`#id`), source channels, sentiment badges, and breakdowns.
- Automated tests: 22 passed, 0 failed (`server/test/api.test.js`).
- Frontend UI: updated `client/src/pages/Insights.jsx` with real backend sync, frequency meters, sentiment breakdowns, collapsible evidence, and graceful empty states.

## Milestone 6 — Action Workflows
- Actions API router: `server/src/routes/actions.js`
  - `GET /api/actions/stats` — completion metrics (total, todo, in_progress, done, cancelled, pct_completed)
  - `GET /api/actions` — filterable by status, priority, insight_id; paginated; LEFT JOINs insight title/severity
  - `GET /api/actions/:id` — single action with joined insight data
  - `POST /api/actions` — creates action; validates title, priority, status, owner, due_date, insight_id FK
  - `PATCH /api/actions/:id` — partial update; same validation; enriches response with insight details
  - `DELETE /api/actions/:id` — returns 404 for missing records
- All endpoints use parameterized SQL; UUID format validated server-side; insight FK existence checked before insert/update.
- Automated tests: 32 passed, 0 failed (10 new tests added).
- Frontend UI:
  - `client/src/pages/Actions.jsx`: replaced demo data with full API integration — real stats, status/priority filters, inline status cycling (persists to DB), Create Action modal (auto-opens when navigated from Insights), delete with confirmation, loading/empty/error states.
  - `client/src/pages/Insights.jsx`: added "Create Action" button on each insight card; navigates to Actions page with insight_id, prefilled title/description, and severity→priority mapping (critical→urgent).
  - `client/src/services/api.js`: added `getActions`, `getActionStats`, `getActionById`, `createAction`, `updateAction`, `deleteAction`.
  - `client/src/components/ui.jsx`: `StatusBadge` handles `in_progress` and `cancelled`; null-safe.
  - `client/src/index.css`: `.priority-dot.urgent` colour token added.

## Security & Secrets
- Never commit `server/.env`.
- `server/.env.example` contains placeholders only.
- No database credentials or API keys exposed in frontend bundle or Git commits.

## Next steps
- Milestone 7: TBD
