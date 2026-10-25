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
1. UI foundation
2. Express API and PostgreSQL schema
3. Persistent feedback CRUD

## Commit 4 — AI classification
- Branch: backup/commit-4-wip
- Commit: 3505d78
- Supports sentiment, category, urgency, and summary classification.
- Migration: server/database/migrations/002_add_classification_fields.sql
- Latest recorded backend tests: 16 passed, 0 failed.

The successful classification test uses a mocked AI provider. Live AI classification and the complete frontend flow still need verification.

## Git status and next steps
- Main remains at Commit 3: ada4362.
- Commit 4 is backed up on backup/commit-4-wip.
- Review the working tree and confirm no secrets are committed.
- Verify the migration, frontend flow, and live AI configuration.
- Merge Commit 4 into main only after verification.
- Next milestones: evidence-backed insights, action tracking, final testing, and deployment documentation.

## Security
- Never commit server/.env.
- Keep API keys and database credentials out of source code and documentation.
- A Supabase database password was exposed previously; rotate it and update the local environment.
- server/.env.example must contain placeholders only.

## Development workflow
Work one milestone at a time, make meaningful Git commits, and run tests after backend changes.
