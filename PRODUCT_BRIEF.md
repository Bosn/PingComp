# PingComp Product Brief

## Users
- Sales/BD: prioritize and outreach high-fit leads
- Ops: clean/enrich/standardize lead records
- PM/Leadership: monitor funnel quality and enrichment throughput

## JTBD
- Quickly identify highest TiDB-fit companies
- Standardize lead records and avoid accidental overwrite
- Track manual edits and confidence over time
- Export curated segments for outreach campaigns

## IA
- Dashboard
- Leads
- Enrichment Queue
- Activity/Audit
- Export
- Settings (language/theme)

## Data model additions
- lead_status (new/contacted/qualified/disqualified)
- owner
- tags
- source_confidence (0-100)
- enrich_status (pending/running/done/failed)
- last_enriched_at
- manual_locked/manual_note/manual_updated_at
- activity_log table (who/what/when)

## Roadmap
- MVP: dashboard + leads v2 + lock-safe edits
- V1: enrichment queue + audit trail + export profiles
- V2: scoring explainability + dedupe assistant + CRM webhook
