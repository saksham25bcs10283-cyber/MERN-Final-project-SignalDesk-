# SignalDesk

AI-powered customer feedback intelligence platform. SignalDesk ingests customer feedback, classifies it using a large language model, surfaces recurring themes as evidence-backed insights, and turns those insights into trackable action workflows — all backed by a live PostgreSQL database.

Built as a software engineering end-term project using a full MERN-adjacent stack: React + Vite, Express, and Supabase PostgreSQL.

---

## Features

| Milestone | Description |
|-----------|-------------|
| **Feedback Inbox** | Create, view, search, filter, edit, and delete customer feedback records. Filter by sentiment, category, source, and urgency. |
| **AI Classification** | Classify any feedback record with a single click. The Express backend calls an OpenAI-compatible LLM to produce `sentiment`, `category`, `urgency`, and a short `summary`. The API key never leaves the server. |
| **Evidence-Backed Insights** | Aggregate classified feedback into recurring theme insights. Each insight includes an evidence count, sentiment breakdown, severity, a recommendation, and verbatim customer quotes linked to real feedback record IDs. Generation is idempotent — repeated runs update existing insights rather than duplicating them. |
| **Action Workflows** | Create and manage product actions directly linked to insights. Track status (`todo` → `in_progress` → `done` / `cancelled`), priority, owner, and due date. Statistics endpoint for completion metrics. |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v7, Vite 8, Lucide React |
| Linting | oxlint |
| Backend | Node.js (v20+), Express 4 |
| Database | PostgreSQL via Supabase (direct connection using `pg`) |
| AI / LLM | OpenAI API or any compatible endpoint (Groq, OpenRouter, etc.) |
| Testing | Node.js built-in test runner (`node --test`) |

---

## Project Structure

```
SignalDesk/
├── client/                          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   │   ├── Topbar.jsx           # Top header bar
│   │   │   └── ui.jsx               # Shared Badge, PriorityDot, StatusBadge components
│   │   ├── pages/
│   │   │   ├── Overview.jsx         # Dashboard summary
│   │   │   ├── Inbox.jsx            # Feedback list, filters, AI classify button
│   │   │   ├── Insights.jsx         # Evidence-backed insight cards
│   │   │   └── Actions.jsx          # Action workflow management
│   │   ├── services/
│   │   │   └── api.js               # Typed fetch client for all backend endpoints
│   │   ├── data/
│   │   │   └── demo.js              # Static demo data for Overview
│   │   ├── App.jsx                  # Router and layout shell
│   │   └── index.css                # Global design tokens and component styles
│   ├── vite.config.js               # Vite config with /api proxy to :5001
│   └── package.json
│
├── server/                          # Express backend
│   ├── database/
│   │   └── migrations/
│   │       ├── 001_initial_schema.sql            # All four tables + triggers
│   │       └── 002_add_classification_fields.sql # classified_at column on feedback
│   ├── src/
│   │   ├── routes/
│   │   │   ├── health.js            # GET /api/health
│   │   │   ├── feedback.js          # Feedback CRUD + AI classify
│   │   │   ├── insights.js          # Insights CRUD + generate
│   │   │   └── actions.js           # Actions CRUD + stats
│   │   ├── services/
│   │   │   ├── ai.js                # LLM prompt, call, parse, and validate
│   │   │   └── insights.js          # Deterministic aggregation logic
│   │   ├── db/
│   │   │   └── index.js             # pg Pool setup and query helper
│   │   ├── app.js                   # Express app, middleware, router mounts
│   │   └── index.js                 # Server entry point (PORT binding)
│   ├── test/
│   │   └── api.test.js              # Integration tests (32 tests, 6 suites)
│   ├── .env.example                 # Environment variable template
│   └── package.json
│
├── package.json                     # Root convenience scripts
└── README.md
```

---

## Prerequisites

- **Node.js** v20 or later (v24 tested)
- **npm** v10 or later
- **Supabase** account and project (free tier works)
- An **OpenAI API key** (or a compatible provider key) for AI classification

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/saksham25bcs10283-cyber/MERN-Final-project-SignalDesk-.git
cd SignalDesk
```

### 2. Configure the backend environment

```bash
cp server/.env.example server/.env
```

Open `server/.env` and fill in your values (see [Environment Variables](#environment-variables) below).

### 3. Apply database migrations

Log in to your [Supabase Dashboard](https://supabase.com/dashboard), open the **SQL Editor**, and run the following two files **in order**:

1. `server/database/migrations/001_initial_schema.sql`
   Creates `feedback`, `insights`, `insight_feedback`, and `actions` tables, indexes, and `updated_at` triggers.

2. `server/database/migrations/002_add_classification_fields.sql`
   Adds the `classified_at` column and index to the `feedback` table.

### 4. Install dependencies

```bash
# Backend
npm --prefix server install

# Frontend
npm --prefix client install
```

### 5. Start the development servers

Run each in a separate terminal:

```bash
# Backend (auto-reloads on change)
npm --prefix server run dev
# → http://localhost:5001

# Frontend
npm --prefix client run dev
# → http://localhost:5173
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:5001`, so no CORS configuration is needed during development.

Alternatively, use the root convenience scripts:

```bash
npm run server:dev   # starts server
npm run client:dev   # starts client
```

### 6. Verify

```bash
curl http://localhost:5001/api/health
```

Expected response:

```json
{
  "status": "ok",
  "message": "SignalDesk API is operational",
  "timestamp": "...",
  "uptime": 5
}
```

---

## Environment Variables

All variables are set in `server/.env` (never committed to Git). Copy from `server/.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Express server port. Default: `5001` |
| `NODE_ENV` | No | `development` or `production` |
| `DATABASE_URL` | **Yes** | Supabase PostgreSQL connection string. Found in Supabase Dashboard → Project Settings → Database → Connection string (URI mode). Format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres` |
| `SUPABASE_URL` | No | Supabase project URL (`https://[PROJECT-ID].supabase.co`) — reserved for future Supabase client usage |
| `SUPABASE_ANON_KEY` | No | Supabase anonymous public key — reserved for future use |
| `OPENAI_API_KEY` | **Yes** (for AI features) | API key for the LLM provider. Without this, the classify endpoint returns 503; all other endpoints continue to work. |
| `OPENAI_MODEL` | No | Model name to use. Default: `gpt-4o-mini` |
| `OPENAI_BASE_URL` | No | Override the API base URL for compatible providers (Groq, OpenRouter, etc.). Default: `https://api.openai.com/v1` |

---

## API Reference

Base URL: `http://localhost:5001`

All endpoints return JSON. Error responses follow `{ "status": "error", "message": "...", "errors": [...] }`.

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns server status and uptime |

### Feedback

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/feedback` | List feedback. Query params: `search`, `category`, `source`, `sentiment`, `urgency`, `classified`, `limit`, `offset` |
| `GET` | `/api/feedback/:id` | Get a single feedback record by UUID |
| `POST` | `/api/feedback` | Create feedback. Body: `content` (required), `source`, `sentiment`, `category`, `urgency`, `summary` |
| `PATCH` | `/api/feedback/:id` | Update editable fields. At least one field required |
| `DELETE` | `/api/feedback/:id` | Delete a feedback record |
| `POST` | `/api/feedback/:id/classify` | Classify feedback using the configured LLM. Updates `sentiment`, `category`, `urgency`, `summary`, and `classified_at` |

**AI classification categories:** `performance`, `usability`, `billing`, `bug`, `feature_request`, `other`
**Sentiment values:** `positive`, `neutral`, `negative`
**Urgency values (feedback):** `low`, `medium`, `high`, `critical`

### Insights

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/insights` | List all insights with their supporting evidence quotes |
| `GET` | `/api/insights/:id` | Get a single insight with full evidence |
| `POST` | `/api/insights/generate` | Deterministically aggregate classified feedback into insights. Idempotent — safe to call repeatedly |
| `DELETE` | `/api/insights/:id` | Delete an insight and its evidence links |

### Actions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/actions/stats` | Completion metrics: total, todo, in_progress, done, cancelled, pct_completed |
| `GET` | `/api/actions` | List actions. Query params: `status`, `priority`, `insight_id`, `limit`, `offset` |
| `GET` | `/api/actions/:id` | Get a single action with linked insight details |
| `POST` | `/api/actions` | Create an action. Body: `title` (required), `description`, `insight_id`, `owner`, `priority`, `status`, `due_date` |
| `PATCH` | `/api/actions/:id` | Update action fields. At least one field required |
| `DELETE` | `/api/actions/:id` | Delete an action |

**Action priority values:** `low`, `medium`, `high`, `urgent`
**Action status values:** `todo`, `in_progress`, `done`, `cancelled`

---

## Development Commands

```bash
# Run backend integration tests (32 tests, requires live DATABASE_URL)
npm --prefix server test

# Lint the frontend (oxlint)
npm --prefix client run lint

# Production build the frontend
npm --prefix client run build

# Preview the production build locally
npm --prefix client run preview
```

---

## Database Schema Summary

| Table | Primary Key | Notable Columns |
|-------|-------------|-----------------|
| `feedback` | UUID | `content`, `source`, `sentiment`, `category`, `urgency`, `summary`, `classified_at` |
| `insights` | UUID | `title`, `description`, `severity`, `recommendation` |
| `insight_feedback` | Composite (`insight_id`, `feedback_id`) | Junction table linking evidence to insights |
| `actions` | UUID | `title`, `insight_id` (FK → `insights`, `ON DELETE SET NULL`), `owner`, `priority`, `status`, `due_date` |

All tables include `created_at` and `updated_at` timestamps. `updated_at` is maintained automatically by a PostgreSQL trigger.

---

## Security Notes

- **Never commit `server/.env`** — it is listed in `.gitignore`.
- `server/.env.example` contains placeholder values only and is safe to commit.
- The `OPENAI_API_KEY` is read exclusively on the server and is never returned in API responses, logged to stdout, or included in the frontend bundle.
- All database queries use parameterized statements (`$1`, `$2`, …) — no string interpolation of user input.
- UUID path parameters are validated with a regex before reaching the database.