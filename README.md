# SignalDesk

Customer feedback intelligence SaaS for software engineering end-term project.

## Project Structure

```
SignalDesk/
├── client/              # React + Vite frontend
│   ├── src/
│   │   ├── components/  # Layout and shared UI components
│   │   ├── pages/       # Overview, Feedback, Insights, Actions
│   │   └── data/        # Demo data
│   └── package.json
├── server/              # Express + PostgreSQL backend
│   ├── database/        # SQL migration files
│   ├── src/             # Express app, routers, middleware
│   ├── .env.example
│   └── package.json
└── package.json         # Root scripts for convenience
```

## Quick Start

### 1. Frontend Setup
```bash
cd client
npm install
npm run dev
```
Accessible at `http://localhost:5173`.

### 2. Backend Setup
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
API running on `http://localhost:5001`.
Health check available at `http://localhost:5001/api/health`.

### 3. Database Migration
Apply the SQL migration file in your Supabase SQL Editor:
`server/database/migrations/001_initial_schema.sql`

See [server/README.md](file:///Users/sakshamlodha/SignalDesk/server/README.md) for full details.