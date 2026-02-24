import express from 'express';
import dotenv from 'dotenv';
import { getConn, migrate, TABLE } from './db.js';

dotenv.config();
const app = express();
const port = Number(process.env.PORT || 3788);

app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  const min = Number(req.query.minScore || 0);
  const onlyLocked = req.query.locked === '1';
  const conn = await getConn();
  let sql = `SELECT id,name,region,vertical,funding,linkedin,latest_news,source,tidb_potential_score,tidb_potential_reason,manual_locked,manual_note,updated_at FROM \`${TABLE}\` WHERE 1=1`;
  const args = [];
  if (q) { sql += ' AND (name LIKE ? OR vertical LIKE ? OR source LIKE ?)'; args.push(`%${q}%`,`%${q}%`,`%${q}%`); }
  if (min > 0) { sql += ' AND IFNULL(tidb_potential_score,0) >= ?'; args.push(min); }
  if (onlyLocked) sql += ' AND manual_locked=1';
  sql += ' ORDER BY IFNULL(tidb_potential_score,0) DESC, updated_at DESC LIMIT 1000';
  const [rows] = await conn.query(sql, args);
  await conn.end();
  res.render('index', { rows, q, min, onlyLocked });
});

app.get('/edit/:id', async (req, res) => {
  const conn = await getConn();
  const [[row]] = await conn.query(`SELECT * FROM \`${TABLE}\` WHERE id=?`, [req.params.id]);
  await conn.end();
  if (!row) return res.status(404).send('Not found');
  res.render('edit', { row });
});

app.post('/edit/:id', async (req, res) => {
  const b = req.body;
  const conn = await getConn();
  await conn.execute(
    `UPDATE \`${TABLE}\` SET
      name=?, region=?, vertical=?, funding=?, linkedin=?, latest_news=?, source=?,
      tidb_potential_score=?, tidb_potential_reason=?, manual_note=?, manual_locked=1, manual_updated_at=NOW()
     WHERE id=?`,
    [b.name, b.region, b.vertical, b.funding, b.linkedin, b.latest_news, b.source,
      b.tidb_potential_score || null, b.tidb_potential_reason, b.manual_note, req.params.id]
  );
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
  const [rows] = await conn.query(`SELECT name,region,vertical,funding,linkedin,latest_news,source,tidb_potential_score,tidb_potential_reason,manual_locked,manual_note,updated_at FROM \`${TABLE}\` ORDER BY IFNULL(tidb_potential_score,0) DESC`);
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
