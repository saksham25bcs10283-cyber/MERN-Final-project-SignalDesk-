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

## Security & Secrets
- Never commit `server/.env`.
- `server/.env.example` contains placeholders only.
- No database credentials or API keys exposed in frontend bundle or Git commits.

## Next steps
- Milestone 6: Action tracking & status management (`actions` table).
