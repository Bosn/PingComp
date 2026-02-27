# PingComp — Interviews v1 (CRM Interview Records)

This is the **QA + evidence checklist** for Interviews v1.

Scope freeze reminders:
- Rich text stored as **HTML** (`transcript_html`), plain text derived (`transcript_plain`)
- No fine-grained permissions
- Soft delete only (`deleted_at`)
- Export format: **Markdown only**
- Batch export: **merged single md**, max **500** records

## 0) Setup / prerequisites
- Server running (local or staging)
  - `GET /api/health` returns `{ ok: true }`
- DB migrated (table `interviews` exists)

## 1) Minimal test dataset (recommended)
Create at least **2 leads** (Lead A / Lead B).
Create at least **3 interviews**:
- A1: Lead A, transcript contains keyword `NOVA`
- B1: Lead B, transcript contains keyword `NOVA`
- A2: Lead A, transcript contains unique keyword `ONLY_A`

Suggested tags for OR tests:
- A1 tags: `pricing,security`
- B1 tags: `onboarding`

## 2) API evidence (copy/paste)
> Evidence to attach: curl commands + JSON responses (redact secrets)

### 2.1 Create
- Endpoint: `POST /api/interviews`
- Must:
  - returns `201`
  - response row includes `transcript_plain` derived from `transcript_html`

### 2.2 Detail
- Endpoint: `GET /api/interviews/:id`
- Must:
  - returns `200`
  - deleted record returns `404`

### 2.3 Update
- Endpoint: `PUT /api/interviews/:id`
- Must:
  - updating `transcriptHtml` updates derived `transcript_plain`

### 2.4 Soft delete
- Endpoint: `DELETE /api/interviews/:id`
- Must:
  - subsequent list/search/export cannot see it

### 2.5 List / search / filter
- Endpoint: `GET /api/interviews`
- Must:
  - cursor pagination works (`nextCursor`)
  - lead scoped: `leadId=<id>` only returns that lead
  - search (`q`) hits `title/summary/structured/transcript_plain/tags`
  - tags OR: `tags=a&tags=b` returns records containing **either**
  - date filters:
    - `datePreset=last7|last30|last90`
    - or `dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`

## 3) UI evidence
> Evidence to attach: screenshots / recordings

### 3.1 Global Interviews Center
- Tab: `Interviews`
- Filters work (q/leadId/channel/interviewer/tags/date)
- Export button downloads `.md`

### 3.2 Lead-level Interviews
- From Leads table: Interviews action opens Lead Interviews modal
- Create/edit/delete works
- Export lead md works

## 4) Export evidence

### 4.1 Single export
- Endpoint: `GET /interviews/:id/export.md`
- Must:
  - Markdown file downloads
  - contains metadata + sections + **Transcript (Plain)**

### 4.2 Batch export (<=500)
- Endpoint: `GET /interviews/export.md?...filters...`
- Must:
  - merged md downloads
  - ordering matches list ordering: `interview_date DESC, id DESC`

### 4.3 >500 guard
- If result count > 500:
  - returns JSON error:
    - `error.code = EXPORT_LIMIT_EXCEEDED`
  - UI should show understandable error (if surfaced)

## 5) Common failure checks
- Chinese content not garbled in UI and export
- API failures show visible UI errors (not silent)
