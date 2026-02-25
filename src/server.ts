import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import { getConn, migrate, TABLE } from './db.js';

dotenv.config();
const app = express();
const port = Number(process.env.PORT || 3788);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

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
    where += ' AND (name LIKE ? OR vertical LIKE ? OR source LIKE ? OR tags LIKE ?)';
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
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
    name_desc: 'name DESC'
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
  }

  await conn.end();
  res.json({ ok: true, updated: ids.length });
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

app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));

// -------- React App only --------
app.use('/app', express.static('web/dist'));
app.get('/app/*', (_req: Request, res: Response) => res.sendFile(process.cwd() + '/web/dist/index.html'));

// remove EJS UI: always redirect to React app
app.get('/', (_req: Request, res: Response) => res.redirect('/app'));
app.get('/dashboard', (_req: Request, res: Response) => res.redirect('/app'));
app.get('/enrich', (_req: Request, res: Response) => res.redirect('/app'));
app.get('/activity', (_req: Request, res: Response) => res.redirect('/app'));
app.get('/export', (_req: Request, res: Response) => res.redirect('/app'));
app.get('/export.csv', (req: Request, res: Response) => {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect('/api/export.csv' + qs);
});

await migrate();
app.listen(port, () => {
  console.log(`PingComp running on http://localhost:${port}`);
});
