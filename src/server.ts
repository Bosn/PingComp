import express, { type NextFunction, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import { auth } from 'express-openid-connect';
import { getConn, migrate, TABLE } from './db.js';
import { htmlToPlain } from './utils/htmlToPlain.js';

dotenv.config();
const app = express();
const port = Number(process.env.PORT || 3788);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));


const authEnabled = String(process.env.AUTH0_ENABLED || '').toLowerCase() === 'true';
// express-openid-connect requires a baseURL in config; real redirect/logout URLs are set per-request below.
const middlewareBaseURL = process.env.APP_BASE_URL || `http://localhost:${port}`;

function getRequestBaseUrl(req: Request): string {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || req.protocol || 'http';
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || req.get('host') || `localhost:${port}`;
  return `${proto}://${host}`;
}

app.get('/auth/denied', (req: Request, res: Response) => {
  const raw = String(req.query.message || '').replace(/[<>]/g, '');
  const isAllowedDomainIssue = /access_denied|only pingcap\.com|checks\.state argument is missing|id_token not present/i.test(raw);
  const title = 'Access restricted';
  const primary = 'This platform is restricted to @pingcap.com accounts only.';
  const detail = isAllowedDomainIssue ? 'Please sign in with your PingCAP Google Workspace account.' : (raw || 'Authentication failed.');

  res.status(403).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(1200px 700px at 10% 10%, rgba(46,129,255,.25), transparent 55%),
                  radial-gradient(900px 600px at 85% 20%, rgba(168,85,247,.25), transparent 50%),
                  #090d18;
      color: #e6ecff;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: min(680px, 100%);
      border: 1px solid rgba(120,140,180,.35);
      background: linear-gradient(180deg, rgba(20,27,44,.9), rgba(14,19,32,.92));
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,.45), inset 0 0 40px rgba(66,116,255,.08);
    }
    .pill {
      display: inline-block;
      font-size: 12px;
      letter-spacing: .04em;
      text-transform: uppercase;
      padding: 6px 10px;
      border-radius: 999px;
      color: #c8d6ff;
      background: rgba(80,120,255,.2);
      border: 1px solid rgba(120,160,255,.35);
      margin-bottom: 12px;
    }
    h1 { margin: 0 0 12px; font-size: 30px; line-height: 1.15; }
    .primary { margin: 0 0 8px; font-size: 17px; color: #f0f4ff; }
    .detail { margin: 0 0 20px; color: #b9c7ea; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn {
      display: inline-block; text-decoration: none; font-weight: 600;
      padding: 10px 14px; border-radius: 10px; transition: .18s ease;
      border: 1px solid rgba(120,160,255,.35); color: #dce7ff;
      background: rgba(60,90,180,.25);
    }
    .btn:hover { transform: translateY(-1px); background: rgba(80,120,255,.3); }
    .btn.secondary { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.16); }
  </style>
</head>
<body>
  <main class="card">
    <span class="pill">PingComp Authentication</span>
    <h1>${title}</h1>
    <p class="primary">${primary}</p>
    <p class="detail">${detail}</p>
    <div class="actions">
      <a class="btn" href="/login-pingcap">Sign in with @pingcap.com</a>
      <a class="btn secondary" href="/logout">Log out</a>
    </div>
  </main>
</body>
</html>`);
});

// Catch Auth0 callback deny/error and show user-friendly page instead of plain "Bad request"
app.get('/callback', (req: Request, res: Response, next: NextFunction) => {
  const err = String(req.query.error || '').toLowerCase();
  if (err) {
    const desc = String(req.query.error_description || req.query.error || 'Access denied');
    return res.redirect(`/auth/denied?message=${encodeURIComponent(desc)}`);
  }
  return next();
});

if (authEnabled) {
  app.use(auth({
    authRequired: false,
    auth0Logout: true,
    secret: process.env.AUTH0_SESSION_SECRET || 'pingcomp-dev-session-secret-change-me',
    baseURL: middlewareBaseURL,
    clientID: process.env.AUTH0_CLIENT_ID || '',
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || '',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
    routes: {
      login: false,
      logout: false,
      callback: '/callback',
    },
  }));
}

const ensureAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!authEnabled) return next();
  const isAuthed = (req as any).oidc?.isAuthenticated?.();
  if (isAuthed) return next();
  const wantsJson = req.path.startsWith('/api/') || String(req.headers.accept || '').includes('application/json');
  if (wantsJson) return res.status(401).json({ ok: false, error: 'unauthorized' });
  return res.redirect('/login-pingcap');
};

app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));

app.get('/login', (_req: Request, res: Response) => res.redirect('/login-pingcap'));

app.get('/login-pingcap', (req: Request, res: Response) => {
  if (!authEnabled || !(res as any).oidc?.login) return res.redirect('/login');
  const callbackUrl = `${getRequestBaseUrl(req)}/callback`;
  return (res as any).oidc.login({
    returnTo: '/app',
    authorizationParams: {
      redirect_uri: callbackUrl,
      connection: 'google-oauth2',
      prompt: 'login',
      login_hint: '@pingcap.com',
      scope: 'openid profile email',
    },
  });
});

app.get('/logout', (req: Request, res: Response) => {
  if (!authEnabled || !(res as any).oidc?.logout) return res.redirect('/');
  const returnTo = getRequestBaseUrl(req);
  return (res as any).oidc.logout({ returnTo });
});


app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health') return next();
  return ensureAuth(req, res, next);
});


async function logActivity(conn: any, leadId: number, action: string, actor = 'pingcomp-ui', beforeObj: any = null, afterObj: any = null) {
  try {
    await conn.execute(
      `INSERT INTO lead_activity_log (lead_id, action, actor, before_json, after_json) VALUES (?, ?, ?, ?, ?)`,
      [leadId, action, actor, beforeObj ? JSON.stringify(beforeObj) : null, afterObj ? JSON.stringify(afterObj) : null]
    );
  } catch {}
}

function getActor(req: Request): string {
  const email = String((req as any).oidc?.user?.email || '').trim();
  return email || 'pingcomp-react';
}

function normalizeEmails(input: any): string[] {
  const raw = Array.isArray(input) ? input.join(',') : String(input ?? '');
  const parts = raw
    .split(/[\n,;]+/g)
    .map(s => String(s).trim().toLowerCase())
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

// -------- API --------

// Interviews v1 (M2 scaffold + core create/update/read/delete)
app.post('/api/interviews', async (req: Request, res: Response) => {
  const b: any = req.body || {};
  const leadId = Number(b.leadId);
  const title = String(b.title || '').trim();
  const interviewDate = String(b.interviewDate || '').trim();
  const channel = String(b.channel || '').trim();
  const transcriptHtml = String(b.transcriptHtml || '').trim();

  if (!Number.isFinite(leadId) || leadId <= 0) return res.status(400).json({ ok: false, error: 'invalid leadId' });
  if (!title) return res.status(400).json({ ok: false, error: 'missing title' });
  if (!interviewDate) return res.status(400).json({ ok: false, error: 'missing interviewDate' });
  if (!channel) return res.status(400).json({ ok: false, error: 'missing channel' });
  if (!transcriptHtml) return res.status(400).json({ ok: false, error: 'missing transcriptHtml' });

  const transcriptPlain = htmlToPlain(transcriptHtml);
  const actor = getActor(req);

  const conn = await getConn();
  try {
    const [r]: any = await conn.execute(
      `INSERT INTO interviews (
        lead_id, title, interview_date, channel, interviewer,
        contact_name, contact_role, company,
        summary, pain_points, current_solution, requirements, objections_risks, next_steps,
        tags, transcript_html, transcript_plain,
        created_by, updated_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        leadId,
        title,
        interviewDate,
        channel,
        b.interviewer || null,
        b.contactName || null,
        b.contactRole || null,
        b.company || null,
        b.summary || null,
        b.painPoints || null,
        b.currentSolution || null,
        b.requirements || null,
        b.objectionsRisks || null,
        b.nextSteps || null,
        Array.isArray(b.tags) ? b.tags.join(',') : (b.tags || null),
        transcriptHtml,
        transcriptPlain,
        actor,
        actor
      ]
    );

    const id = Number(r?.insertId || 0);
    const [[row]]: any = await conn.query(`SELECT * FROM interviews WHERE id=? AND deleted_at IS NULL`, [id]);
    return res.status(201).json({ ok: true, row });
  } finally {
    await conn.end();
  }
});

app.get('/api/interviews/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: 'invalid id' });
  const conn = await getConn();
  try {
    const [[row]]: any = await conn.query(`SELECT * FROM interviews WHERE id=? AND deleted_at IS NULL`, [id]);
    if (!row) return res.status(404).json({ ok: false, error: 'not found' });
    return res.json({ ok: true, row });
  } finally {
    await conn.end();
  }
});

app.put('/api/interviews/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: 'invalid id' });

  const b: any = req.body || {};
  const actor = getActor(req);

  const conn = await getConn();
  try {
    const [[before]]: any = await conn.query(`SELECT * FROM interviews WHERE id=? AND deleted_at IS NULL`, [id]);
    if (!before) return res.status(404).json({ ok: false, error: 'not found' });

    const transcriptHtml = b.transcriptHtml != null ? String(b.transcriptHtml || '') : null;
    const transcriptPlain = transcriptHtml != null ? htmlToPlain(transcriptHtml) : null;

    await conn.execute(
      `UPDATE interviews SET
        title=?, interview_date=?, channel=?, interviewer=?,
        contact_name=?, contact_role=?, company=?,
        summary=?, pain_points=?, current_solution=?, requirements=?, objections_risks=?, next_steps=?,
        tags=?,
        transcript_html=COALESCE(?, transcript_html),
        transcript_plain=COALESCE(?, transcript_plain),
        updated_at=NOW(), updated_by=?
      WHERE id=? AND deleted_at IS NULL`,
      [
        String(b.title ?? before.title),
        String(b.interviewDate ?? before.interview_date),
        String(b.channel ?? before.channel),
        b.interviewer ?? before.interviewer,
        b.contactName ?? before.contact_name,
        b.contactRole ?? before.contact_role,
        b.company ?? before.company,
        b.summary ?? before.summary,
        b.painPoints ?? before.pain_points,
        b.currentSolution ?? before.current_solution,
        b.requirements ?? before.requirements,
        b.objectionsRisks ?? before.objections_risks,
        b.nextSteps ?? before.next_steps,
        (Array.isArray(b.tags) ? b.tags.join(',') : (b.tags ?? before.tags)),
        transcriptHtml,
        transcriptPlain,
        actor,
        id
      ]
    );

    const [[row]]: any = await conn.query(`SELECT * FROM interviews WHERE id=? AND deleted_at IS NULL`, [id]);
    return res.json({ ok: true, row });
  } finally {
    await conn.end();
  }
});

app.delete('/api/interviews/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: 'invalid id' });
  const actor = getActor(req);
  const conn = await getConn();
  try {
    const [[row]]: any = await conn.query(`SELECT id FROM interviews WHERE id=? AND deleted_at IS NULL`, [id]);
    if (!row) return res.status(404).json({ ok: false, error: 'not found' });
    await conn.execute(`UPDATE interviews SET deleted_at=NOW(), updated_at=NOW(), updated_by=? WHERE id=? AND deleted_at IS NULL`, [actor, id]);
    return res.json({ ok: true, id });
  } finally {
    await conn.end();
  }
});

// List/search/filter (basic LIKE; tags OR)
function parseTagsQuery(q: any): string[] {
  // Supports ?tags=a&tags=b and/or ?tag=a
  return ([] as any[])
    .concat(q?.tags || [])
    .concat(q?.tag || [])
    .flat()
    .map(String)
    .map(s => s.trim())
    .filter(Boolean);
}

function parseDateRange(q: any): { from: string | null; to: string | null } {
  const preset = String(q?.datePreset || '').trim();
  let from = String(q?.dateFrom || q?.from || '').trim();
  let to = String(q?.dateTo || q?.to || '').trim();

  // Presets (PRD): last7/30/90 (+ custom)
  if (!from && !to && preset) {
    const now = new Date();
    const days = preset === 'last7' ? 7 : preset === 'last30' ? 30 : preset === 'last90' ? 90 : 0;
    if (days > 0) {
      const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      // Use YYYY-MM-DD in UTC
      from = d.toISOString().slice(0, 10);
      to = now.toISOString().slice(0, 10);
    }
  }

  if (!from) from = '';
  if (!to) to = '';

  return {
    from: from ? from : null,
    to: to ? to : null,
  };
}

function renderInterviewMarkdown(interview: any, leadName: string | null): string {
  const tags = String(interview?.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean);

  const lines: string[] = [];
  lines.push(`# ${interview?.title || ''}`);
  lines.push('');
  lines.push(`- Interview ID: ${interview?.id}`);
  lines.push(`- Lead: ${(leadName || '-')} (${interview?.lead_id})`);
  lines.push(`- Date: ${String(interview?.interview_date || '')}`);
  lines.push(`- Channel: ${String(interview?.channel || '')}`);
  lines.push(`- Interviewer: ${String(interview?.interviewer || '-')}`);
  lines.push(`- Contact: ${String(interview?.contact_name || '-')}` + (interview?.contact_role ? ` / ${String(interview.contact_role)}` : ''));
  lines.push(`- Company: ${String(interview?.company || '-')}`);
  lines.push(`- Tags: ${tags.length ? tags.join(', ') : '-'}`);

  const section = (title: string, body: any) => {
    const v = String(body || '').trim();
    if (!v) return;
    lines.push('');
    lines.push(`## ${title}`);
    lines.push(v);
  };

  section('Summary', interview?.summary);
  section('Pain Points', interview?.pain_points);
  section('Current Solution', interview?.current_solution);
  section('Requirements', interview?.requirements);
  section('Objections / Risks', interview?.objections_risks);
  section('Next Steps', interview?.next_steps);
  section('Transcript (Plain)', interview?.transcript_plain);

  lines.push('');
  return lines.join('\n');
}

function ensureAuthForNonApi(req: Request, res: Response, next: NextFunction) {
  // Reuse same rule as /api router to avoid exposing exports unauth.
  return ensureAuth(req, res, next);
}

app.get('/api/interviews', async (req: Request, res: Response) => {
  const leadId = String(req.query.leadId || '').trim();
  const q = String(req.query.q || '').trim();
  const channel = String(req.query.channel || '').trim();
  const interviewer = String(req.query.interviewer || '').trim();
  const tags = parseTagsQuery(req.query);
  const { from, to } = parseDateRange(req.query);
  const limit = Math.min(100, Math.max(10, Number(req.query.limit || 20)));
  const cursor = String(req.query.cursor || '').trim();

  let cursorDate: string | null = null;
  let cursorId: number | null = null;
  if (cursor) {
    const m = cursor.split('|');
    if (m.length === 2) {
      cursorDate = m[0];
      cursorId = Number(m[1]);
      if (!Number.isFinite(cursorId)) cursorId = null;
    }
  }

  const conn = await getConn();
  try {
    let where = ' WHERE deleted_at IS NULL';
    const args: any[] = [];

    if (leadId) { where += ' AND lead_id=?'; args.push(Number(leadId)); }
    if (channel) { where += ' AND channel=?'; args.push(channel); }
    if (interviewer) { where += ' AND interviewer LIKE ?'; args.push(`%${interviewer}%`); }
    if (from) { where += ' AND interview_date >= ?'; args.push(from); }
    if (to) { where += ' AND interview_date <= ?'; args.push(to); }

    if (q) {
      where += ' AND (title LIKE ? OR company LIKE ? OR interviewer LIKE ? OR summary LIKE ? OR pain_points LIKE ? OR current_solution LIKE ? OR requirements LIKE ? OR objections_risks LIKE ? OR next_steps LIKE ? OR transcript_plain LIKE ? OR tags LIKE ?)';
      for (let i = 0; i < 11; i++) args.push(`%${q}%`);
    }

    // tags OR: match any tag substring in the comma-separated tags field.
    if (tags.length) {
      where += ' AND (' + tags.map(() => 'tags LIKE ?').join(' OR ') + ')';
      for (const t of tags) args.push(`%${t}%`);
    }

    if (cursorDate && cursorId) {
      where += ' AND (interview_date < ? OR (interview_date = ? AND id < ?))';
      args.push(cursorDate, cursorDate, cursorId);
    }

    const [rows]: any = await conn.query(
      `SELECT id,lead_id,title,interview_date,channel,interviewer,company,summary,tags,updated_at
       FROM interviews ${where}
       ORDER BY interview_date DESC, id DESC
       LIMIT ?`,
      [...args, limit]
    );

    const nextCursor = rows?.length ? `${rows[rows.length - 1].interview_date}|${rows[rows.length - 1].id}` : null;
    return res.json({ ok: true, rows: rows || [], nextCursor });
  } finally {
    await conn.end();
  }
});

// Export endpoints (PRD paths, auth-protected)
app.get('/interviews/:id/export.md', ensureAuthForNonApi, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).send('invalid id');

  const conn = await getConn();
  try {
    const [[it]]: any = await conn.query(`SELECT * FROM interviews WHERE id=? AND deleted_at IS NULL`, [id]);
    if (!it) return res.status(404).send('Not found');

    const [[lead]]: any = await conn.query(`SELECT id,name FROM \`${TABLE}\` WHERE id=?`, [Number(it.lead_id)]);
    const leadName = lead?.name || null;

    const md = renderInterviewMarkdown(it, leadName);
    res.status(200);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="interview_${id}.md"`);
    return res.send(md);
  } finally {
    await conn.end();
  }
});

app.get('/interviews/export.md', ensureAuthForNonApi, async (req: Request, res: Response) => {
  const leadId = String(req.query.leadId || '').trim();
  const q = String(req.query.q || '').trim();
  const channel = String(req.query.channel || '').trim();
  const interviewer = String(req.query.interviewer || '').trim();
  const tags = parseTagsQuery(req.query);
  const { from, to } = parseDateRange(req.query);

  const conn = await getConn();
  try {
    let where = ' WHERE deleted_at IS NULL';
    const args: any[] = [];

    if (leadId) { where += ' AND lead_id=?'; args.push(Number(leadId)); }
    if (channel) { where += ' AND channel=?'; args.push(channel); }
    if (interviewer) { where += ' AND interviewer LIKE ?'; args.push(`%${interviewer}%`); }
    if (from) { where += ' AND interview_date >= ?'; args.push(from); }
    if (to) { where += ' AND interview_date <= ?'; args.push(to); }

    if (q) {
      where += ' AND (title LIKE ? OR company LIKE ? OR interviewer LIKE ? OR summary LIKE ? OR pain_points LIKE ? OR current_solution LIKE ? OR requirements LIKE ? OR objections_risks LIKE ? OR next_steps LIKE ? OR transcript_plain LIKE ? OR tags LIKE ?)';
      for (let i = 0; i < 11; i++) args.push(`%${q}%`);
    }

    if (tags.length) {
      where += ' AND (' + tags.map(() => 'tags LIKE ?').join(' OR ') + ')';
      for (const t of tags) args.push(`%${t}%`);
    }

    const [countRows]: any = await conn.query(`SELECT COUNT(*) c FROM interviews ${where}`, args);
    const total = Number(countRows?.[0]?.c || 0);
    if (total > 500) {
      return res.status(400).json({ ok: false, error: { code: 'EXPORT_LIMIT_EXCEEDED', message: 'Export supports up to 500 interviews. Please narrow your filters.' }, total });
    }

    const [rows]: any = await conn.query(
      `SELECT * FROM interviews ${where} ORDER BY interview_date DESC, id DESC`,
      args
    );

    // Build leadId->name map to avoid per-row queries.
    const leadIds = Array.from(new Set((rows || []).map((r: any) => Number(r.lead_id)).filter((n: any) => Number.isFinite(n))));
    let leadMap = new Map<number, string>();
    if (leadIds.length) {
      const placeholders = leadIds.map(() => '?').join(',');
      const [leadRows]: any = await conn.query(`SELECT id,name FROM \`${TABLE}\` WHERE id IN (${placeholders})`, leadIds);
      for (const lr of (leadRows || [])) leadMap.set(Number(lr.id), String(lr.name || ''));
    }

    const headerLines: string[] = [];
    headerLines.push('# Interviews Export');
    headerLines.push('');
    headerLines.push(`- Exported At: ${new Date().toISOString()}`);
    headerLines.push(`- Query: ${q || '-'}`);
    headerLines.push(`- LeadId: ${leadId || '-'}`);
    headerLines.push(`- Channel: ${channel || '-'}`);
    headerLines.push(`- Interviewer: ${interviewer || '-'}`);
    headerLines.push(`- Tags: ${tags.length ? tags.join(', ') : '-'}`);
    headerLines.push(`- Total: ${total}`);
    headerLines.push('');
    headerLines.push('---');
    headerLines.push('');

    const blocks: string[] = [];
    let i = 0;
    for (const it of (rows || [])) {
      i++;
      const leadName = leadMap.get(Number(it.lead_id)) || null;
      blocks.push(`## ${i}. ${it.title || ''}`);
      blocks.push('');
      blocks.push(renderInterviewMarkdown(it, leadName).replace(/^# /, '')); // strip top-level header
      blocks.push('---');
      blocks.push('');
    }

    const md = headerLines.join('\n') + blocks.join('\n');

    res.status(200);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="interviews_export_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.md"`);
    return res.send(md);
  } finally {
    await conn.end();
  }
});

app.get('/api/leads', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  const min = Number(req.query.minScore || 0);
  const status = String(req.query.status || '').trim();
  const region = String(req.query.region || '').trim();
  const onlyLocked = req.query.locked === '1';
  const sort = String(req.query.sort || 'score_desc').trim();
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(200, Math.max(10, Number(req.query.pageSize || 50)));

  const conn = await getConn();
  let where = ' WHERE 1=1';
  const args: any[] = [];
  if (q) {
    where += ' AND (name LIKE ? OR owner LIKE ? OR vertical LIKE ? OR source LIKE ? OR tags LIKE ?)';
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (min > 0) { where += ' AND IFNULL(tidb_potential_score,0) >= ?'; args.push(min); }
  if (status) { where += ' AND lead_status=?'; args.push(status); }
  if (region) { where += ' AND region LIKE ?'; args.push(`%${region}%`); }
  if (onlyLocked) { where += ' AND manual_locked=1'; }

  const sortMap: Record<string, string> = {
    score_desc: 'IFNULL(tidb_potential_score,0) DESC, updated_at DESC',
    score_asc: 'IFNULL(tidb_potential_score,0) ASC, updated_at DESC',
    updated_desc: 'updated_at DESC',
    updated_asc: 'updated_at ASC',
    created_desc: 'created_at DESC',
    created_asc: 'created_at ASC',
    name_asc: 'name ASC',
    name_desc: 'name DESC',
    id_desc: 'id DESC',
    id_asc: 'id ASC',
    owner_desc: 'owner DESC, updated_at DESC',
    owner_asc: 'owner ASC, updated_at DESC',
    vertical_desc: 'vertical DESC, updated_at DESC',
    vertical_asc: 'vertical ASC, updated_at DESC',
    status_desc: 'lead_status DESC, updated_at DESC',
    status_asc: 'lead_status ASC, updated_at DESC'
  };
  const orderBy = sortMap[sort] || sortMap.score_desc;

  const [countRows]: any = await conn.query(`SELECT COUNT(*) c FROM \`${TABLE}\` ${where}`, args);
  const total = Number((countRows?.[0]?.c) || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const [rows] = await conn.query(
    `SELECT id,name,region,vertical,funding,linkedin,emails,latest_news,source,tidb_potential_score,tidb_potential_reason,manual_locked,manual_note,lead_status,owner,creator,tags,source_confidence,enrich_status,created_at,updated_at FROM \`${TABLE}\` ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...args, pageSize, offset]
  );
  await conn.end();
  res.json({ rows, total, page: safePage, totalPages, pageSize });
});

app.get('/api/leads/:id', async (req: Request, res: Response) => {
  const conn = await getConn();
  const [rows]: any = await conn.query(`SELECT * FROM \`${TABLE}\` WHERE id=?`, [req.params.id]);
  await conn.end();
  if (!rows?.[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.get('/api/leads/:id/emails', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: 'invalid id' });

  const conn = await getConn();
  const [rows]: any = await conn.query('SELECT emails FROM `' + TABLE + '` WHERE id=?', [id]);
  await conn.end();
  if (!rows?.[0]) return res.status(404).json({ ok: false, error: 'not found' });

  const raw = String(rows?.[0]?.emails || '');
  const emails = normalizeEmails(raw);
  return res.json({ ok: true, id, emails, raw });
});

app.put('/api/leads/:id/emails', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: 'invalid id' });

  const b: any = req.body || {};
  const nextEmails = normalizeEmails(b.emails ?? b.value ?? b);
  const nextRaw = nextEmails.length ? nextEmails.join(',') : null;
  const actor = getActor(req);

  const conn = await getConn();
  try {
    const [beforeRows]: any = await conn.query('SELECT emails FROM `' + TABLE + '` WHERE id=?', [id]);
    const before = beforeRows?.[0] || null;
    if (!before) return res.status(404).json({ ok: false, error: 'not found' });

    await conn.execute('UPDATE `' + TABLE + '` SET emails=?, updated_at=NOW(), manual_updated_at=NOW(), manual_locked=1 WHERE id=?', [nextRaw, id]);

    await logActivity(conn, id, 'api_emails_update', actor, before, { emails: nextRaw });

    const [afterRows]: any = await conn.query('SELECT emails FROM `' + TABLE + '` WHERE id=?', [id]);
    const raw = String(afterRows?.[0]?.emails || '');
    const emails = normalizeEmails(raw);
    return res.json({ ok: true, id, emails, raw });
  } finally {
    await conn.end();
  }
});

app.put('/api/leads/:id', async (req: Request, res: Response) => {
  const b: any = req.body || {};
  const conn = await getConn();
  const [beforeRows]: any = await conn.query(`SELECT * FROM \`${TABLE}\` WHERE id=?`, [req.params.id]);
  const beforeRow = beforeRows?.[0] || null;

  await conn.execute(
    `UPDATE \`${TABLE}\` SET
      name=?, region=?, vertical=?, funding=?, linkedin=?, latest_news=?, source=?,
      tidb_potential_score=?, tidb_potential_reason=?, manual_note=?, lead_status=?, owner=?, tags=?, source_confidence=?, enrich_status=?,
      manual_locked=1, manual_updated_at=NOW(), updated_at=NOW()
     WHERE id=?`,
    [
      b.name || '', b.region || '', b.vertical || '', b.funding || '', b.linkedin || '', b.latest_news || '', b.source || '',
      b.tidb_potential_score || null, b.tidb_potential_reason || '', b.manual_note || '', b.lead_status || 'new', b.owner || null,
      b.tags || null, b.source_confidence || null, b.enrich_status || 'pending', req.params.id
    ]
  );

  await logActivity(conn, Number(req.params.id), 'api_manual_edit_lock', 'pingcomp-react', beforeRow, b);
  const [rows]: any = await conn.query(`SELECT * FROM \`${TABLE}\` WHERE id=?`, [req.params.id]);
  await conn.end();
  res.json({ ok: true, row: rows?.[0] || null });
});

app.post('/api/bulk', async (req: Request, res: Response) => {
  const ids = (String(req.body.ids || '')).split(',').map(x => Number(x.trim())).filter(n => Number.isFinite(n) && n > 0);
  const action = String(req.body.action || '').trim();
  if (!ids.length) return res.status(400).json({ ok: false, error: 'empty ids' });

  const conn = await getConn();
  const placeholders = ids.map(() => '?').join(',');

  if (action === 'lock') {
    await conn.query(`UPDATE \`${TABLE}\` SET manual_locked=1, manual_updated_at=NOW() WHERE id IN (${placeholders})`, ids);
    for (const id of ids) await logActivity(conn, id, 'bulk_lock');
  } else if (action === 'unlock') {
    await conn.query(`UPDATE \`${TABLE}\` SET manual_locked=0 WHERE id IN (${placeholders})`, ids);
    for (const id of ids) await logActivity(conn, id, 'bulk_unlock');
  } else if (action.startsWith('status:')) {
    const v = action.split(':', 2)[1] || 'new';
    await conn.query(`UPDATE \`${TABLE}\` SET lead_status=? WHERE id IN (${placeholders})`, [v, ...ids]);
    for (const id of ids) await logActivity(conn, id, `bulk_status:${v}`);
  } else if (action === 'delete') {
    const [beforeRows]: any = await conn.query(`SELECT * FROM \`${TABLE}\` WHERE id IN (${placeholders})`, ids);
    await conn.query(`DELETE FROM \`${TABLE}\` WHERE id IN (${placeholders})`, ids);
    for (const row of (beforeRows || [])) await logActivity(conn, Number(row.id), 'bulk_delete', 'pingcomp-react', row, null);
  }

  await conn.end();
  res.json({ ok: true, updated: ids.length });
});

app.delete('/api/leads/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: 'invalid id' });
  const conn = await getConn();
  const [[row]]: any = await conn.query(`SELECT * FROM \`${TABLE}\` WHERE id=?`, [id]);
  if (!row) {
    await conn.end();
    return res.status(404).json({ ok: false, error: 'not found' });
  }
  await conn.query(`DELETE FROM \`${TABLE}\` WHERE id=?`, [id]);
  await logActivity(conn, id, 'api_delete', 'pingcomp-react', row, null);
  await conn.end();
  return res.json({ ok: true, id });
});



app.post('/api/outreach/email-sends', async (req: Request, res: Response) => {
  const b: any = req.body || {};
  const leadId = Number(b.leadId);
  const email = String(b.email || '').trim().toLowerCase();
  const subject = b.subject == null ? null : String(b.subject || '').trim();
  const content = b.content == null ? null : String(b.content || '');
  const actor = getActor(req);
  const sender = String(b.sender || actor).trim() || null;

  if (!Number.isFinite(leadId) || leadId <= 0) return res.status(400).json({ ok: false, error: 'invalid leadId' });
  if (!email) return res.status(400).json({ ok: false, error: 'missing email' });

  const conn = await getConn();
  try {
    // Optional sentAt for backfill/testing; otherwise DB default CURRENT_TIMESTAMP.
    const sentAt = b.sentAt ? new Date(String(b.sentAt)) : null;
    const hasSentAt = sentAt && !Number.isNaN(sentAt.getTime());

    if (hasSentAt) {
      await conn.execute(
        'INSERT INTO outreach_email_sends (lead_id, email, sent_at, subject, content, sender) VALUES (?, ?, ?, ?, ?, ?)',
        [leadId, email, sentAt.toISOString().slice(0, 19).replace('T', ' '), subject, content, sender]
      );
    } else {
      await conn.execute(
        'INSERT INTO outreach_email_sends (lead_id, email, subject, content, sender) VALUES (?, ?, ?, ?, ?)',
        [leadId, email, subject, content, sender]
      );
    }

    const [rows]: any = await conn.query('SELECT * FROM outreach_email_sends WHERE lead_id=? AND email=? ORDER BY id DESC LIMIT 1', [leadId, email]);
    return res.json({ ok: true, row: rows?.[0] || null });
  } finally {
    await conn.end();
  }
});

app.get('/api/outreach/email-sends', async (req: Request, res: Response) => {
  const leadId = req.query.leadId == null ? null : Number(req.query.leadId);
  const email = String(req.query.email || '').trim().toLowerCase();
  const from = String(req.query.from || '').trim();
  const to = String(req.query.to || '').trim();
  const limit = Math.min(500, Math.max(1, Number(req.query.limit || 200)));

  let where = ' WHERE 1=1';
  const args: any[] = [];

  if (leadId != null) {
    if (!Number.isFinite(leadId) || leadId <= 0) return res.status(400).json({ ok: false, error: 'invalid leadId' });
    where += ' AND lead_id=?';
    args.push(leadId);
  }

  if (email) {
    where += ' AND email=?';
    args.push(email);
  }

  if (from) {
    const d = new Date(from);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ ok: false, error: 'invalid from' });
    where += ' AND sent_at>=?';
    args.push(d.toISOString().slice(0, 19).replace('T', ' '));
  }

  if (to) {
    const d = new Date(to);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ ok: false, error: 'invalid to' });
    where += ' AND sent_at<=?';
    args.push(d.toISOString().slice(0, 19).replace('T', ' '));
  }

  const conn = await getConn();
  try {
    const [rows]: any = await conn.query(`SELECT * FROM outreach_email_sends ${where} ORDER BY sent_at DESC, id DESC LIMIT ?`, [...args, limit]);
    return res.json({ ok: true, rows });
  } finally {
    await conn.end();
  }
});

app.post('/api/agent/chat', async (req: Request, res: Response) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ ok: false, error: 'empty message' });

  const qwenKey = String(process.env.QWEN_API_KEY || '').trim();
  const qwenModel = String(process.env.QWEN_MODEL || 'qwen-plus').trim();
  const qwenBase = String(process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation').trim();

  const conn = await getConn();

  // Dynamic chart intent (pie/line/bar): score distribution by 10-point buckets
  if (/chart|图|饼图|pie|折线|line|柱状|bar/i.test(message)) {
    const chartType = /pie|饼图/i.test(message)
      ? 'pie'
      : /line|折线/i.test(message)
      ? 'line'
      : 'bar';

    const [bucketRows]: any = await conn.query(`
      SELECT
        CASE
          WHEN IFNULL(tidb_potential_score,0) >= 100 THEN 100
          ELSE FLOOR(IFNULL(tidb_potential_score,0)/10)*10
        END AS b,
        COUNT(*) AS c
      FROM \`${TABLE}\`
      GROUP BY b
      ORDER BY b ASC
    `);

    const map = new Map<number, number>();
    for (const r of (bucketRows || [])) map.set(Number(r.b || 0), Number(r.c || 0));
    const labels: string[] = [];
    const values: number[] = [];
    for (let i = 0; i <= 90; i += 10) {
      labels.push(i === 90 ? '90-100' : `${i}-${i + 9}`);
      values.push(map.get(i) || 0);
    }

    await conn.end();
    return res.json({
      ok: true,
      mode: 'chart',
      reply: `已按 0-100 每10分分桶统计，共 ${values.reduce((a, b) => a + b, 0)} 家。`,
      rows: [],
      chart: {
        type: chartType,
        title: 'Potential Companies Score Distribution (10-point bins)',
        labels,
        values
      }
    });
  }


  const runQwen = async (system: string, user: string) => {
    if (!qwenKey) throw new Error('missing_qwen_api_key');
    const isIntlGenApi = qwenBase.includes('/api/v1/services/aigc/text-generation/generation');
    const body = isIntlGenApi
      ? {
          model: qwenModel,
          input: { messages: [{ role: 'system', content: system }, { role: 'user', content: user }] },
          parameters: { result_format: 'message', temperature: 0.1 }
        }
      : {
          model: qwenModel,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: 0.1
        };

    const rr = await fetch(qwenBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${qwenKey}` },
      body: JSON.stringify(body)
    });
    if (!rr.ok) {
      const errText = await rr.text();
      throw new Error(`qwen_http_${rr.status}:${errText.slice(0, 180)}`);
    }
    const jj: any = await rr.json();
    return String(
      jj?.choices?.[0]?.message?.content ||
      jj?.output?.choices?.[0]?.message?.content ||
      jj?.output?.text || ''
    ).trim();
  };

  const isSafeReadOnlySql = (sqlRaw: string) => {
    const sql = sqlRaw.trim().replace(/;\s*$/, '');
    if (!/^select\b/i.test(sql)) return false;
    if (/\b(insert|update|delete|replace|drop|alter|truncate|create|grant|revoke|call|execute|show|desc|describe|explain|set|use|commit|rollback)\b/i.test(sql)) return false;
    if (/--|\/\*|\*\//.test(sql)) return false;
    if (/\b(information_schema|mysql\.|performance_schema|sys\.)\b/i.test(sql)) return false;
    const fromOk = new RegExp(`\\bfrom\\s+${TABLE}\\b`, 'i').test(sql.replace(/`/g, ''));
    if (!fromOk) return false;
    return true;
  };

  let mode: 'qwen-sql' | 'fallback-60' | 'rule' = 'rule';
  let llmError: string | null = null;
  let rows: any[] = [];
  let sqlUsed = '';

  if (qwenKey) {
    try {
      const sqlPrompt = `Table: ${TABLE}\nColumns: id,name,region,vertical,funding,linkedin,latest_news,source,tidb_potential_score,tidb_potential_reason,manual_locked,lead_status,owner,tags,source_confidence,enrich_status,created_at,updated_at.\nGenerate ONE read-only SQL SELECT for MySQL to answer the user question.\nConstraints: SELECT only, from ${TABLE} only, no comments, no semicolon, include LIMIT <= 200. Return JSON only: {\"sql\":\"...\"}.`;
      const sqlText = await runQwen(sqlPrompt, message);
      const m = sqlText.match(/\{[\s\S]*\}/);
      const parsed = m ? JSON.parse(m[0]) : null;
      const sql = String(parsed?.sql || '').trim();
      if (sql && isSafeReadOnlySql(sql)) {
        sqlUsed = sql.replace(/;\s*$/, '');
        const [qRows]: any = await conn.query(sqlUsed);
        rows = Array.isArray(qRows) ? qRows.slice(0, 200) : [];
        mode = rows.length ? 'qwen-sql' : 'fallback-60';
      } else {
        mode = 'fallback-60';
      }
    } catch (e: any) {
      llmError = String(e?.message || e || 'qwen_error');
      mode = 'fallback-60';
    }
  } else {
    mode = 'fallback-60';
  }

  if (mode === 'fallback-60') {
    const regionHints: Record<string, string[]> = {
      '华北': ['CN', 'China', 'Beijing', 'Tianjin', 'Hebei', 'Shanxi', 'Inner Mongolia'],
      '华东': ['CN', 'China', 'Shanghai', 'Jiangsu', 'Zhejiang', 'Anhui', 'Fujian', 'Jiangxi', 'Shandong'],
      '华南': ['CN', 'China', 'Guangdong', 'Guangxi', 'Hainan', 'Hong Kong', 'Macau']
    };

    let fallbackWhere = 'WHERE IFNULL(tidb_potential_score,0) >= 60';
    const fallbackArgs: any[] = [];

    const ownerMatch = message.match(/owner\s*(?:是|=|:)?\s*([a-zA-Z0-9_\-\u4e00-\u9fa5]+)/i);
    if (ownerMatch?.[1]) {
      fallbackWhere += ' AND owner LIKE ?';
      fallbackArgs.push(`%${ownerMatch[1]}%`);
    }

    for (const k of Object.keys(regionHints)) {
      if (message.includes(k)) {
        const terms = regionHints[k];
        fallbackWhere += ' AND (' + terms.map(() => 'region LIKE ?').join(' OR ') + ')';
        for (const t of terms) fallbackArgs.push(`%${t}%`);
        break;
      }
    }

    const [baseRows]: any = await conn.query(
      `SELECT id,name,region,owner,vertical,lead_status,manual_locked,tidb_potential_score,tidb_potential_reason,updated_at
       FROM \`${TABLE}\`
       ${fallbackWhere}
       ORDER BY IFNULL(tidb_potential_score,0) DESC, updated_at DESC
       LIMIT 200`,
      fallbackArgs
    );
    const pool = Array.isArray(baseRows) ? baseRows : [];

    if (qwenKey) {
      try {
        const ansPrompt = `You are a CRM analyst. Based on provided rows, answer the question and pick most relevant rows. Return strict JSON:\n{\"reply\":\"...\",\"ids\":[1,2,...]} with max 50 ids.\nIf no good match, return empty ids.`;
        const compactRows = pool.map((r: any) => ({
          id: r.id, name: r.name, region: r.region, owner: r.owner, vertical: r.vertical,
          score: r.tidb_potential_score, status: r.lead_status, locked: r.manual_locked
        }));
        const ansText = await runQwen(ansPrompt, `Question: ${message}\nRows: ${JSON.stringify(compactRows)}`);
        const m2 = ansText.match(/\{[\s\S]*\}/);
        const parsed2 = m2 ? JSON.parse(m2[0]) : null;
        const ids = Array.isArray(parsed2?.ids) ? parsed2.ids.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x)) : [];
        const idSet = new Set(ids);
        rows = pool.filter((r: any) => idSet.has(Number(r.id))).slice(0, 50);
        if (!rows.length) rows = pool.slice(0, 50);
        const reply = String(parsed2?.reply || '').trim() || `基于 score>=60 的候选池，先给你返回最相关结果。`;
        await conn.end();
        return res.json({ ok: true, mode: 'fallback-60', llmError, reply, rows, sqlUsed: null });
      } catch (e: any) {
        llmError = llmError || String(e?.message || e || 'fallback_llm_error');
      }
    }

    rows = pool.slice(0, 50);
  }

  await conn.end();

  const count = rows.length;
  const names = rows.slice(0, 5).map((r: any) => `${r.name}(${r.tidb_potential_score ?? '-'})`).join('，');
  const modeTag = mode === 'qwen-sql' ? `（Qwen SQL: ${qwenModel}）` : mode === 'fallback-60' ? '（Fallback score>=60）' : '（Rule Mode）';
  const note = llmError ? `\n备注：${llmError.slice(0, 120)}` : '';
  const reply = count
    ? `找到 ${count} 条结果${modeTag}。前几条：${names}${count >= 50 ? '（结果已截断）' : ''}${note}`
    : `没有匹配到结果${modeTag}。${note}`;

  return res.json({ ok: true, mode, llmError, sqlUsed: sqlUsed || null, reply, rows });
});

app.get('/api/export.csv', async (req: Request, res: Response) => {
  const conn = await getConn();
  const min = Number(req.query.minScore || 0);
  const onlyLocked = req.query.locked === '1';
  const status = String(req.query.status || '').trim();
  let where = ' WHERE 1=1';
  const args: any[] = [];
  if (min > 0) { where += ' AND IFNULL(tidb_potential_score,0) >= ?'; args.push(min); }
  if (onlyLocked) { where += ' AND manual_locked=1'; }
  if (status) { where += ' AND lead_status=?'; args.push(status); }
  const [rows]: any = await conn.query(
    `SELECT name,region,vertical,funding,linkedin,latest_news,source,tidb_potential_score,tidb_potential_reason,lead_status,owner,tags,source_confidence,enrich_status,manual_locked,manual_note,created_at,updated_at FROM \`${TABLE}\` ${where} ORDER BY IFNULL(tidb_potential_score,0) DESC`,
    args
  );
  await conn.end();

  const headers = Object.keys(rows[0] || {
    name: '', region: '', vertical: '', funding: '', linkedin: '', latest_news: '', source: '',
    tidb_potential_score: '', tidb_potential_reason: '', lead_status: '', owner: '', tags: '',
    source_confidence: '', enrich_status: '', manual_locked: '', manual_note: '', created_at: '', updated_at: ''
  });
  const esc = (v: any) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers.join(','), ...rows.map((r: any) => headers.map(h => esc(r[h])).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="pingcomp_export.csv"');
  res.send(csv);
});



app.get('/api/regions', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  const conn = await getConn();
  const args: any[] = [];
  let where = "WHERE region IS NOT NULL AND region <> ''";
  if (q) {
    where += " AND region LIKE ?";
    args.push(`%${q}%`);
  }
  const [rows]: any = await conn.query(
    `SELECT region, COUNT(*) c FROM \`${TABLE}\` ${where} GROUP BY region ORDER BY c DESC, region ASC LIMIT 100`,
    args
  );
  await conn.end();
  res.json({
    rows: (rows || []).map((r: any) => ({ value: r.region, label: r.region, count: Number(r.c || 0) }))
  });
});

app.get('/api/dashboard', async (_req: Request, res: Response) => {
  const conn = await getConn();
  const [[tot]]: any = await conn.query(`SELECT COUNT(*) c FROM \`${TABLE}\``);
  const [[locked]]: any = await conn.query(`SELECT COUNT(*) c FROM \`${TABLE}\` WHERE manual_locked=1`);
  const [[avgScore]]: any = await conn.query(`SELECT ROUND(AVG(IFNULL(tidb_potential_score,0)),1) score FROM \`${TABLE}\``);
  const [statusRows] = await conn.query(`SELECT lead_status, COUNT(*) c FROM \`${TABLE}\` GROUP BY lead_status ORDER BY c DESC`);
  const [topRows] = await conn.query(`SELECT id,name,tidb_potential_score,lead_status,manual_locked FROM \`${TABLE}\` ORDER BY IFNULL(tidb_potential_score,0) DESC LIMIT 12`);
  const [trendRows]: any = await conn.query(`
    SELECT DATE(updated_at) d, COUNT(*) c
    FROM \`${TABLE}\`
    WHERE updated_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(updated_at)
    ORDER BY d ASC
  `);
  const [scoreBuckets] = await conn.query(`
    SELECT
      CASE
        WHEN IFNULL(tidb_potential_score,0) >= 80 THEN '80-100'
        WHEN IFNULL(tidb_potential_score,0) >= 60 THEN '60-79'
        WHEN IFNULL(tidb_potential_score,0) >= 40 THEN '40-59'
        ELSE '0-39'
      END bucket,
      COUNT(*) c
    FROM \`${TABLE}\`
    GROUP BY bucket
    ORDER BY FIELD(bucket, '80-100', '60-79', '40-59', '0-39')
  `);
  const [enrichRows] = await conn.query(`
    SELECT IFNULL(enrich_status, 'unknown') enrich_status, COUNT(*) c
    FROM \`${TABLE}\`
    GROUP BY IFNULL(enrich_status, 'unknown')
    ORDER BY c DESC
  `);
  const dailyTrend = Array.isArray(trendRows) ? trendRows.map((r:any)=>({ d: String(r.d), c: Number(r.c||0) })) : [];
  await conn.end();
  res.json({ total: tot?.c || 0, locked: locked?.c || 0, avgScore: avgScore?.score || 0, statusRows, topRows, dailyTrend, scoreBuckets, enrichRows });
});

app.get('/api/enrich/queue', async (_req: Request, res: Response) => {
  const conn = await getConn();
  const [rows] = await conn.query(`
    SELECT q.id, q.lead_id, q.status, q.attempts, q.last_error, q.updated_at, c.name, c.enrich_status
    FROM lead_enrichment_queue q
    LEFT JOIN \`${TABLE}\` c ON c.id = q.lead_id
    ORDER BY q.updated_at DESC
    LIMIT 500
  `);
  const [[stats]]: any = await conn.query(`
    SELECT
      SUM(status='pending') pending,
      SUM(status='running') running,
      SUM(status='done') done_count,
      SUM(status='failed') failed
    FROM lead_enrichment_queue
  `);
  await conn.end();
  res.json({ rows, stats: stats || { pending: 0, running: 0, done_count: 0, failed: 0 } });
});

app.post('/api/enrich/enqueue', async (req: Request, res: Response) => {
  const idsRaw = String(req.body.ids || '').trim();
  const ids = idsRaw.split(',').map(x => Number(x.trim())).filter(n => Number.isFinite(n) && n > 0);
  if (!ids.length) return res.status(400).json({ ok: false, error: 'empty ids' });
  const conn = await getConn();
  for (const id of ids) {
    await conn.execute(
      `INSERT INTO lead_enrichment_queue (lead_id, status, attempts)
       VALUES (?, 'pending', 0)
       ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP`,
      [id]
    );
    await logActivity(conn, id, 'enrich_enqueue');
  }
  await conn.end();
  res.json({ ok: true, queued: ids.length });
});

app.post('/api/enrich/run', async (_req: Request, res: Response) => {
  const conn = await getConn();
  const [jobs]: any = await conn.query(`
    SELECT q.id, q.lead_id, q.attempts, c.name, c.latest_news, c.linkedin, c.manual_locked
    FROM lead_enrichment_queue q
    JOIN \`${TABLE}\` c ON c.id=q.lead_id
    WHERE q.status IN ('pending','failed')
    ORDER BY q.updated_at ASC
    LIMIT 20
  `);

  for (const j of jobs) {
    try {
      await conn.execute(`UPDATE lead_enrichment_queue SET status='running', attempts=attempts+1 WHERE id=?`, [j.id]);
      await conn.execute(`UPDATE \`${TABLE}\` SET enrich_status='done', last_enriched_at=NOW() WHERE id=?`, [j.lead_id]);
      await conn.execute(`UPDATE lead_enrichment_queue SET status='done', last_error=NULL WHERE id=?`, [j.id]);
      await logActivity(conn, j.lead_id, 'enrich_done');
    } catch (e: any) {
      await conn.execute(`UPDATE lead_enrichment_queue SET status='failed', last_error=? WHERE id=?`, [String(e?.message || e).slice(0, 800), j.id]);
      await conn.execute(`UPDATE \`${TABLE}\` SET enrich_status='failed' WHERE id=?`, [j.lead_id]);
      await logActivity(conn, j.lead_id, 'enrich_failed');
    }
  }

  await conn.end();
  res.json({ ok: true, processed: jobs.length });
});

// -------- React App only --------
app.use('/app', ensureAuth, express.static('web/dist'));
app.get('/app/*', ensureAuth, (_req: Request, res: Response) => res.sendFile(process.cwd() + '/web/dist/index.html'));

// remove EJS UI: always redirect to React app
app.get('/', (req: Request, res: Response) => {
  if (authEnabled && !(req as any).oidc?.isAuthenticated?.()) return res.redirect('/login-pingcap');
  return res.redirect('/app');
});
app.get('/dashboard', (_req: Request, res: Response) => res.redirect('/app'));
app.get('/enrich', (_req: Request, res: Response) => res.redirect('/app'));
app.get('/activity', (_req: Request, res: Response) => res.redirect('/app'));
app.get('/export', (_req: Request, res: Response) => res.redirect('/app'));
app.get('/export.csv', (req: Request, res: Response) => {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect('/api/export.csv' + qs);
});

// Auth callback error fallback (friendly UX instead of raw Bad Request)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const msg = String(err?.message || '');
  const isAuthCallbackError = req.path === '/callback' ||
    msg.includes('access_denied') ||
    msg.includes('checks.state argument is missing') ||
    msg.includes('id_token not present');

  if (isAuthCallbackError) {
    const safe = msg.replace(/[<>]/g, '') || 'Access denied';
    return res.redirect(`/auth/denied?message=${encodeURIComponent(safe)}`);
  }
  return next(err);
});

await migrate();
app.listen(port, () => {
  console.log(`PingComp running on http://localhost:${port}`);
});
