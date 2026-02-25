import express from 'express';
import dotenv from 'dotenv';
import { getConn, migrate, TABLE } from './db.js';
import { messages, pickLang } from './i18n/index.js';

dotenv.config();
const app = express();
const port = Number(process.env.PORT || 3788);

app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use((req, _res, next) => {
  const lang = pickLang(String(req.query.lang || req.headers['x-lang'] || 'zh'));
  req.lang = lang;
  req.t = messages[lang] || messages.zh;
  next();
});





app.get('/enrich', async (_req, res) => {
  const conn = await getConn();
  const [rows] = await conn.query(`
    SELECT q.id, q.lead_id, q.status, q.attempts, q.last_error, q.updated_at, c.name, c.enrich_status
    FROM lead_enrichment_queue q
    LEFT JOIN \`${TABLE}\` c ON c.id = q.lead_id
    ORDER BY q.updated_at DESC
    LIMIT 500
  `);
  const [[stats]] = await conn.query(`
    SELECT
      SUM(status='pending') pending,
      SUM(status='running') running,
      SUM(status='done') done_count,
      SUM(status='failed') failed
    FROM lead_enrichment_queue
  `);
  await conn.end();
  res.render('enrich', { rows, stats: stats || {pending:0,running:0,done_count:0,failed:0}, lang: req.lang, t: req.t });
});

app.post('/enrich/enqueue', async (req, res) => {
  const idsRaw = String(req.body.ids || '').trim();
  const ids = idsRaw.split(',').map(x => Number(x.trim())).filter(n => Number.isFinite(n) && n > 0);
  if (!ids.length) return res.redirect('/enrich');
  const conn = await getConn();
  for (const id of ids) {
    await conn.execute(
      `INSERT INTO lead_enrichment_queue (lead_id, status, attempts)
       VALUES (?, 'pending', 0)
       ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP`,
      [id]
    );
  }
  await conn.end();
  res.redirect('/enrich');
});

app.post('/enrich/run', async (_req, res) => {
  const conn = await getConn();
  const [jobs] = await conn.query(`
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
      // placeholder enrichment: mark as done, touch enrich_status/last_enriched_at
      await conn.execute(`UPDATE \`${TABLE}\` SET enrich_status='done', last_enriched_at=NOW() WHERE id=?`, [j.lead_id]);
      await conn.execute(`UPDATE lead_enrichment_queue SET status='done', last_error=NULL WHERE id=?`, [j.id]);
    } catch (e) {
      await conn.execute(`UPDATE lead_enrichment_queue SET status='failed', last_error=? WHERE id=?`, [String(e.message || e).slice(0,800), j.id]);
      await conn.execute(`UPDATE \`${TABLE}\` SET enrich_status='failed' WHERE id=?`, [j.lead_id]);
    }
  }

  await conn.end();
  res.redirect('/enrich');
});

app.post('/enrich/retry/:id', async (req, res) => {
  const conn = await getConn();
  await conn.execute(`UPDATE lead_enrichment_queue SET status='pending', last_error=NULL WHERE id=?`, [req.params.id]);
  await conn.end();
  res.redirect('/enrich');
});

app.get('/dashboard', async (_req, res) => {
  const conn = await getConn();
  const [[tot]] = await conn.query(`SELECT COUNT(*) c FROM \`${TABLE}\``);
  const [[locked]] = await conn.query(`SELECT COUNT(*) c FROM \`${TABLE}\` WHERE manual_locked=1`);
  const [[avgScore]] = await conn.query(`SELECT ROUND(AVG(IFNULL(tidb_potential_score,0)),1) score FROM \`${TABLE}\``);
  const [statusRows] = await conn.query(`SELECT lead_status, COUNT(*) c FROM \`${TABLE}\` GROUP BY lead_status ORDER BY c DESC`);
  const [topRows] = await conn.query(`SELECT id,name,tidb_potential_score,lead_status,manual_locked FROM \`${TABLE}\` ORDER BY IFNULL(tidb_potential_score,0) DESC LIMIT 12`);
  await conn.end();
  res.render('dashboard', { tot: tot.c, locked: locked.c, avgScore: avgScore.score || 0, statusRows, topRows, lang: req.lang, t: req.t });
});

app.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  const min = Number(req.query.minScore || 0);
  const onlyLocked = req.query.locked === '1';
  const status = (req.query.status || '').trim();
  const sort = (req.query.sort || 'score_desc').trim();
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(200, Math.max(10, Number(req.query.pageSize || 50)));

  const conn = await getConn();
  let where = ' WHERE 1=1';
  const args = [];
  if (q) { where += ' AND (name LIKE ? OR vertical LIKE ? OR source LIKE ? OR tags LIKE ?)'; args.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`); }
  if (min > 0) { where += ' AND IFNULL(tidb_potential_score,0) >= ?'; args.push(min); }
  if (onlyLocked) where += ' AND manual_locked=1';
  if (status) { where += ' AND lead_status=?'; args.push(status); }

  const sortMap = {
    score_desc: 'IFNULL(tidb_potential_score,0) DESC, updated_at DESC',
    score_asc: 'IFNULL(tidb_potential_score,0) ASC, updated_at DESC',
    updated_desc: 'updated_at DESC',
    updated_asc: 'updated_at ASC',
    name_asc: 'name ASC',
    name_desc: 'name DESC'
  };
  const orderBy = sortMap[sort] || sortMap.score_desc;

  const [[countRow]] = await conn.query(`SELECT COUNT(*) c FROM \`${TABLE}\` ${where}`, args);
  const total = Number(countRow.c || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const [rows] = await conn.query(
    `SELECT id,name,region,vertical,funding,linkedin,latest_news,source,tidb_potential_score,tidb_potential_reason,manual_locked,manual_note,lead_status,owner,tags,source_confidence,enrich_status,updated_at FROM \`${TABLE}\` ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...args, pageSize, offset]
  );

  const [statusRows] = await conn.query(`SELECT lead_status, COUNT(*) c FROM \`${TABLE}\` GROUP BY lead_status ORDER BY c DESC`);
  await conn.end();

  res.render('index', { rows, q, min, onlyLocked, status, sort, page: safePage, pageSize, total, totalPages, statusRows, lang: req.lang, t: req.t });
});

app.get('/edit/:id', async (req, res) => {
  const conn = await getConn();
  const [[row]] = await conn.query(`SELECT * FROM \`${TABLE}\` WHERE id=?`, [req.params.id]);
  await conn.end();
  if (!row) return res.status(404).send('Not found');
  res.render('edit', { row, lang: req.lang, t: req.t });
});

app.post('/edit/:id', async (req, res) => {
  const b = req.body;
  const conn = await getConn();
  await conn.execute(
    `UPDATE \`${TABLE}\` SET
      name=?, region=?, vertical=?, funding=?, linkedin=?, latest_news=?, source=?,
      tidb_potential_score=?, tidb_potential_reason=?, manual_note=?, lead_status=?, owner=?, tags=?, source_confidence=?, enrich_status=?, manual_locked=1, manual_updated_at=NOW()
     WHERE id=?`,
    [b.name, b.region, b.vertical, b.funding, b.linkedin, b.latest_news, b.source,
      b.tidb_potential_score || null, b.tidb_potential_reason, b.manual_note, b.lead_status || 'new', b.owner || null, b.tags || null, b.source_confidence || null, b.enrich_status || 'pending', req.params.id]
  );
  await conn.end();
  res.redirect('/');
});


app.post('/bulk', async (req, res) => {
  const idsRaw = String(req.body.ids || '').trim();
  const action = String(req.body.action || '').trim();
  const ids = idsRaw.split(',').map(x => Number(x.trim())).filter(n => Number.isFinite(n) && n > 0);
  if (!ids.length) return res.redirect('/');

  const conn = await getConn();
  const placeholders = ids.map(() => '?').join(',');

  if (action === 'lock') {
    await conn.query(`UPDATE \`${TABLE}\` SET manual_locked=1, manual_updated_at=NOW() WHERE id IN (${placeholders})`, ids);
  } else if (action === 'unlock') {
    await conn.query(`UPDATE \`${TABLE}\` SET manual_locked=0 WHERE id IN (${placeholders})`, ids);
  } else if (action.startsWith('status:')) {
    const v = action.split(':', 2)[1] || 'new';
    await conn.query(`UPDATE \`${TABLE}\` SET lead_status=? WHERE id IN (${placeholders})`, [v, ...ids]);
  }

  await conn.end();
  res.redirect('/');
});

app.post('/unlock/:id', async (req, res) => {
  const conn = await getConn();
  await conn.execute(`UPDATE \`${TABLE}\` SET manual_locked=0 WHERE id=?`, [req.params.id]);
  await conn.end();
  res.redirect('/');
});

app.get('/export.csv', async (_req, res) => {
  const conn = await getConn();
  const [rows] = await conn.query(`SELECT name,region,vertical,funding,linkedin,latest_news,source,tidb_potential_score,tidb_potential_reason,lead_status,owner,tags,source_confidence,enrich_status,manual_locked,manual_note,updated_at FROM \`${TABLE}\` ORDER BY IFNULL(tidb_potential_score,0) DESC`);
  await conn.end();
  const headers = Object.keys(rows[0] || {
    name:'',region:'',vertical:'',funding:'',linkedin:'',latest_news:'',source:'',tidb_potential_score:'',tidb_potential_reason:'',manual_locked:'',manual_note:'',updated_at:''
  });
  const esc = (v) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="pingcomp_export.csv"');
  res.send(csv);
});

await migrate();
app.listen(port, () => {
  console.log(`PingComp running on http://localhost:${port}`);
});
