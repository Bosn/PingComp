import express, { type NextFunction, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import { auth } from 'express-openid-connect';
import { getConn, migrate, TABLE } from './db.js';

dotenv.config();
const app = express();
const port = Number(process.env.PORT || 3788);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));


const authEnabled = String(process.env.AUTH0_ENABLED || '').toLowerCase() === 'true';
const baseURL = process.env.APP_BASE_URL || `http://localhost:${port}`;

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
    baseURL,
    clientID: process.env.AUTH0_CLIENT_ID || '',
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || '',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
    routes: {
      login: '/login',
      logout: '/logout',
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
  return res.redirect('/login');
};

app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));

app.get('/login-pingcap', (req: Request, res: Response) => {
  if (!authEnabled || !(res as any).oidc?.login) return res.redirect('/login');
  return (res as any).oidc.login({
    returnTo: '/app',
    authorizationParams: {
      connection: 'google-oauth2',
      prompt: 'login',
      login_hint: '@pingcap.com',
      scope: 'openid profile email',
    },
  });
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

// -------- API --------
app.get('/api/leads', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  const min = Number(req.query.minScore || 0);
  const status = String(req.query.status || '').trim();
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
    `SELECT id,name,region,vertical,funding,linkedin,latest_news,source,tidb_potential_score,tidb_potential_reason,manual_locked,manual_note,lead_status,owner,tags,source_confidence,enrich_status,created_at,updated_at FROM \`${TABLE}\` ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
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



app.post('/api/agent/chat', async (req: Request, res: Response) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ ok: false, error: 'empty message' });

  const qwenKey = String(process.env.QWEN_API_KEY || '').trim();
  const qwenModel = String(process.env.QWEN_MODEL || 'qwen-plus').trim();
  const qwenBase = String(process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation').trim();

  const fallbackIntentFromRule = () => {
    const lower = message.toLowerCase();
    const statusMap: Record<string, string> = {
      new: 'new', contacted: 'contacted', qualified: 'qualified', disqualified: 'disqualified',
      新建: 'new', 已联系: 'contacted', 合格: 'qualified', 不合格: 'disqualified'
    };
    let status: string | null = null;
    for (const k of Object.keys(statusMap)) {
      if (lower.includes(k.toLowerCase())) { status = statusMap[k]; break; }
    }
    const scoreMatch = message.match(/(?:>=|>|大于|高于|不少于|at\s*least|above)?\s*(\d{1,3})\s*(?:分|score|\+)?/i);
    const minScore = scoreMatch && Number(scoreMatch[1]) > 0 && Number(scoreMatch[1]) <= 100 ? Number(scoreMatch[1]) : null;
    const ownerMatch = message.match(/owner\s*(?:是|=|:)?\s*([a-zA-Z0-9_\-\u4e00-\u9fa5]+)/i);
    const owner = ownerMatch ? ownerMatch[1] : null;
    const isStats = /总数|多少|统计|count|total|summary|概况|overview/.test(lower);
    const lockedOnly = /锁定|locked/.test(lower);
    const limit = /全部|所有|all/.test(lower) ? 100 : 30;
    const keyword = message.replace(/(帮我|查询|查下|看看|潜在客户|线索|数据|please|find|search|show|list|客户)/gi, '').trim() || null;
    return { isStats, minScore, status, lockedOnly, owner, keyword, limit };
  };

  let intent: any = fallbackIntentFromRule();
  let llmUsed = false;
  let llmError: string | null = null;

  if (qwenKey) {
    try {
      const system = `You are a query parser for a CRM leads table. Return strict JSON only.\nSchema:\n{\n  "isStats": boolean,\n  "minScore": number|null,\n  "status": "new"|"contacted"|"qualified"|"disqualified"|null,\n  "lockedOnly": boolean,\n  "owner": string|null,\n  "keyword": string|null,\n  "limit": number\n}\nRules: limit 1-100, minScore 0-100 or null, keep concise.`;
      const isIntlGenApi = qwenBase.includes('/api/v1/services/aigc/text-generation/generation');
      const body = isIntlGenApi
        ? {
            model: qwenModel,
            input: {
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: message }
              ]
            },
            parameters: {
              result_format: 'message',
              temperature: 0.1
            }
          }
        : {
            model: qwenModel,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: message }
            ],
            temperature: 0.1
          };
      const rr = await fetch(qwenBase, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${qwenKey}`,
        },
        body: JSON.stringify(body)
      });
      if (rr.ok) {
        const jj: any = await rr.json();
        const text = String(
          jj?.choices?.[0]?.message?.content ||
          jj?.output?.choices?.[0]?.message?.content ||
          jj?.output?.text ||
          ''
        ).trim();
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]);
          intent = {
            isStats: Boolean(parsed?.isStats),
            minScore: (typeof parsed?.minScore === 'number' && parsed.minScore >= 0 && parsed.minScore <= 100) ? parsed.minScore : null,
            status: ['new', 'contacted', 'qualified', 'disqualified'].includes(parsed?.status) ? parsed.status : null,
            lockedOnly: Boolean(parsed?.lockedOnly),
            owner: parsed?.owner ? String(parsed.owner).slice(0, 120) : null,
            keyword: parsed?.keyword ? String(parsed.keyword).slice(0, 200) : null,
            limit: Math.max(1, Math.min(100, Number(parsed?.limit || 30))),
          };
          llmUsed = true;
        } else {
          llmError = 'qwen_no_json_in_response';
        }
      } else {
        const errText = await rr.text();
        llmError = `qwen_http_${rr.status}:${errText.slice(0,160)}`;
      }
    } catch (e: any) {
      llmError = String(e?.message || e || 'qwen_error');
      // fallback stays
    }
  }

  const conn = await getConn();

  if (intent.isStats) {
    const [[tot]]: any = await conn.query(`SELECT COUNT(*) c FROM \`${TABLE}\``);
    const [[locked]]: any = await conn.query(`SELECT COUNT(*) c FROM \`${TABLE}\` WHERE manual_locked=1`);
    const [[avgScore]]: any = await conn.query(`SELECT ROUND(AVG(IFNULL(tidb_potential_score,0)),1) score FROM \`${TABLE}\``);
    const [statusRows]: any = await conn.query(`SELECT lead_status, COUNT(*) c FROM \`${TABLE}\` GROUP BY lead_status ORDER BY c DESC`);
    await conn.end();
    const statusText = (statusRows || []).map((r: any) => `${r.lead_status}:${r.c}`).join('，');
    return res.json({
      ok: true,
      reply: `当前共有 ${tot?.c || 0} 条潜在客户，锁定 ${locked?.c || 0} 条，平均分 ${avgScore?.score || 0}。状态分布：${statusText || '暂无'}。`,
      rows: []
    });
  }

  let where = ' WHERE 1=1';
  const args: any[] = [];

  if (typeof intent.minScore === 'number') {
    where += ' AND IFNULL(tidb_potential_score,0) >= ?';
    args.push(intent.minScore);
  }
  if (intent.lockedOnly) where += ' AND manual_locked=1';
  if (intent.status) { where += ' AND lead_status=?'; args.push(intent.status); }
  if (intent.owner) { where += ' AND owner LIKE ?'; args.push(`%${intent.owner}%`); }
  if (intent.keyword) {
    where += ' AND (name LIKE ? OR owner LIKE ? OR vertical LIKE ? OR source LIKE ? OR tags LIKE ? OR tidb_potential_reason LIKE ?)';
    args.push(`%${intent.keyword}%`, `%${intent.keyword}%`, `%${intent.keyword}%`, `%${intent.keyword}%`, `%${intent.keyword}%`, `%${intent.keyword}%`);
  }

  const limit = Math.max(1, Math.min(100, Number(intent.limit || 30)));
  const [rows]: any = await conn.query(
    `SELECT id,name,owner,vertical,lead_status,manual_locked,tidb_potential_score,updated_at,tidb_potential_reason FROM \`${TABLE}\` ${where} ORDER BY IFNULL(tidb_potential_score,0) DESC, updated_at DESC LIMIT ?`,
    [...args, limit]
  );
  await conn.end();

  const count = Array.isArray(rows) ? rows.length : 0;
  const names = (rows || []).slice(0, 5).map((r: any) => `${r.name}(${r.tidb_potential_score ?? '-'})`).join('，');
  const modeTag = llmUsed ? `（Qwen:${qwenModel}）` : '（Rule Mode）';
  const note = (!llmUsed && llmError) ? `\n备注：Qwen 未生效（${llmError.slice(0,80)}）` : '';
  const reply = count
    ? `找到 ${count} 条结果${modeTag}。前几条：${names}${count >= limit ? '（结果已截断）' : ''}${note}`
    : `没有匹配到结果${modeTag}，可以换个关键词或放宽条件。${note}`;

  return res.json({ ok: true, mode: llmUsed ? 'qwen' : 'rule', llmError, reply, rows: rows || [] });
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
