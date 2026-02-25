# PingComp

Web app for viewing, editing, cleaning, and exporting AI customer leads.

## Features
- Auth0 login (Google SSO)
- List/filter/search leads
- Manual edit & lock (`manual_locked=1`)
- Unlock item if needed
- CSV export
- Manual edits are intended to be highest priority

## Run
```bash
cp .env.example .env
# fill DB_* with your TiDB/MySQL cloud config
# if enabling Auth0, fill AUTH0_* and set AUTH0_ENABLED=true
npm install
npm start
```
Open: http://localhost:3788

## Auth0 setup (Google SSO)
1. In Auth0 create a Regular Web Application.
2. Configure:
   - Allowed Callback URLs: `https://your-domain/callback` (or `http://localhost:3788/callback` for local)
   - Allowed Logout URLs: `https://your-domain` (or `http://localhost:3788`)
   - Allowed Web Origins: `https://your-domain` (or `http://localhost:3788`)
3. In Auth0 add Google social connection and enable it for this app.
4. Set env vars in `.env`:
   - `AUTH0_ENABLED=true`
   - `APP_BASE_URL=https://your-domain`
   - `AUTH0_ISSUER_BASE_URL=https://<your-tenant>.auth0.com`
   - `AUTH0_CLIENT_ID=...`
   - `AUTH0_CLIENT_SECRET=...`
   - `AUTH0_SESSION_SECRET=<long random string>`

## Data strategy
- MySQL is source of truth.
- Rows manually edited in PingComp are marked `manual_locked=1`.
- Upstream writer (PingAICustomers) must respect manual lock in upsert logic.


## New modules (M1~M6)
- Dashboard: `/dashboard`
- Leads v2: `/` (advanced filters, sort, pagination, bulk)
- Enrichment Queue: `/enrich`
- Activity Log: `/activity`
- Export Center: `/export`

## Manual-governance guarantee
- Manual edits set `manual_locked=1`.
- Upstream sync must respect lock and never overwrite locked records.


## UI architecture (React-only)
- EJS pages removed.
- Web UI is React + Mantine at `/app`.
- Legacy routes (`/`, `/dashboard`, `/enrich`, `/activity`, `/export`) redirect to `/app`.
- API endpoints are under `/api/*`.
