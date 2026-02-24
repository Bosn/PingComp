# PingComp

Web app for viewing, editing, cleaning, and exporting AI customer leads.

## Features
- No login required (env-based DB access)
- List/filter/search leads
- Manual edit & lock (`manual_locked=1`)
- Unlock item if needed
- CSV export
- Manual edits are intended to be highest priority

## Run
```bash
cp .env.example .env
# fill DB_* with your TiDB/MySQL cloud config
npm install
npm start
```
Open: http://localhost:3788

## Data strategy
- MySQL is source of truth.
- Rows manually edited in PingComp are marked `manual_locked=1`.
- Upstream writer (PingAICustomers) must respect manual lock in upsert logic.
