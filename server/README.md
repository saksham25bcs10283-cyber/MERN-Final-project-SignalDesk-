# SignalDesk Backend API

Express API and PostgreSQL database schema for SignalDesk customer feedback intelligence platform.

## Setup Instructions

### 1. Prerequisites
- Node.js (v20+ recommended, v24 tested)
- npm
- Supabase account & project

### 2. Environment Variables
Copy `.env.example` to `.env` in the `server` directory:
```bash
cp .env.example .env
```
Configure your environment variables in `.env`:
- `PORT`: Port to run the Express server (default `5001`)
- `NODE_ENV`: `development` or `production`
- `DATABASE_URL`: Your Supabase connection string (`postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`)
- `SUPABASE_URL`: Your Supabase project URL (`https://[PROJECT-ID].supabase.co`)
- `SUPABASE_ANON_KEY`: Your Supabase anonymous public API key

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Migration (Supabase PostgreSQL)
The initial database schema migration is located at:
`server/database/migrations/001_initial_schema.sql`

To apply the migration to your Supabase project:
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project and navigate to the **SQL Editor** tab on the left sidebar.
3. Click **New query**, paste the contents of `server/database/migrations/001_initial_schema.sql`, and click **Run**.
4. The migration will create:
   - `feedback` table (with sentiment, urgency, source, category indexes)
   - `insights` table (with severity index)
   - `insight_feedback` junction table (unique composite primary key)
   - `actions` table (with status, priority, due date indexes)
   - Triggers for automatic `updated_at` timestamps

### 5. Running the Server

#### Development mode (auto-reload on changes):
```bash
npm run dev
```

#### Production mode:
```bash
npm start
```

### 6. Health Check Endpoint
Once running, check the API status:
```bash
curl http://localhost:5001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "SignalDesk API is operational",
  "timestamp": "2026-10-25T05:20:00.000Z",
  "uptime": 12
}
```

### 7. Feedback CRUD Endpoints
- `GET /api/feedback`: List feedback records with optional query parameters (`search`, `category`, `source`, `sentiment`, `urgency`, `limit`, `offset`).
- `GET /api/feedback/:id`: Retrieve single feedback record by UUID.
- `POST /api/feedback`: Create a new feedback record. Requires `content` or `summary`, plus optional `source`, `category`, `urgency`, `sentiment`.
- `PATCH /api/feedback/:id`: Update editable fields (`content`, `summary`, `source`, `category`, `urgency`, `sentiment`).
- `DELETE /api/feedback/:id`: Delete feedback record by UUID.

### 8. Running Automated Tests
```bash
npm test
```
Executes the test suite covering health, 404 routing, validation rejection (UUID, invalid values, empty body), and error handling.
