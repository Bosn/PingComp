#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

dotenv.config({ path: path.resolve('/home/ec2-user/git/PingComp/.env') });

const execFileAsync = promisify(execFile);
const ROOT = '/home/ec2-user/git/PingComp';
const BRIEF_DIR = path.join(ROOT, 'brief');
const STATE_PATH = path.join(BRIEF_DIR, 'state.json');
const AGENT_ID = process.env.BRIEF_AGENT_ID || 'pingcomp-sandbox';
const LIMIT = Number(process.env.BRIEF_LIMIT || 20);

async function ensureDir() {
  await fs.mkdir(BRIEF_DIR, { recursive: true });
}

async function loadState() {
  try {
    const raw = await fs.readFile(STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      lastHash: '',
      analyzed: { leads: {}, interviews: {} },
      lastFile: null,
      updatedAt: null,
    };
  }
}

async function saveState(state) {
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function sha(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}_${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}`;
}

function keyOf(row) {
  return `${row.id}:${row.updated_at || row.created_at || ''}`;
}

async function fetchData() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || process.env.DB_HOST,
    port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
    user: process.env.MYSQL_USER || process.env.DB_USER,
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
    charset: 'utf8mb4',
    ssl: String(process.env.MYSQL_SSL || process.env.DB_SSL || '').toLowerCase() === 'false'
      ? undefined
      : { minVersion: 'TLSv1.2', rejectUnauthorized: false },
  });

  try {
    const [newLeads] = await conn.query(
      `SELECT id,name,lead_status,owner,region,city,tidb_potential_score,created_at,updated_at
       FROM ai_customers
       ORDER BY created_at DESC
       LIMIT ?`,
      [LIMIT],
    );

    const [updatedLeads] = await conn.query(
      `SELECT id,name,lead_status,owner,region,city,tidb_potential_score,created_at,updated_at
       FROM ai_customers
       WHERE updated_at > created_at
       ORDER BY updated_at DESC
       LIMIT ?`,
      [LIMIT],
    );

    const [newInterviews] = await conn.query(
      `SELECT id,lead_id,title,company,interviewer,channel,created_at,updated_at
       FROM interviews
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ?`,
      [LIMIT],
    );

    return {
      newLeads,
      updatedLeads,
      newInterviews,
    };
  } finally {
    await conn.end();
  }
}

async function summarizeWithAgent(payload) {
  const msg = [
    '你是 PingComp Brief 生成器。请基于给定 JSON 生成简报。',
    '输出必须是 Markdown。',
    '结构要求：',
    '1) ## 本次变化概览',
    '2) ## 新增 Leads（重点 5 条）',
    '3) ## 新增 Interview（重点 5 条）',
    '4) ## 最近修改 Leads（重点 5 条）',
    '5) ## 建议动作（最多 8 条）',
    '6) ## 风险与异常',
    '要求：用中文；尽量简洁；若无明显风险可写“暂无明显风险”。',
    '',
    '输入 JSON：',
    JSON.stringify(payload),
  ].join('\n');

  const { stdout } = await execFileAsync('openclaw', [
    '--no-color',
    'agent',
    '--agent', AGENT_ID,
    '--session-id', `brief-${Date.now()}`,
    '--message', msg,
    '--timeout', '120',
    '--json',
  ], { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 });

  const txt = String(stdout || '').trim();
  const m = txt.match(/\{[\s\S]*\}$/);
  const parsed = m ? JSON.parse(m[0]) : {};
  const payloads = parsed?.result?.payloads;
  if (Array.isArray(payloads)) {
    return payloads.map((p) => String(p?.text || '')).join('\n').trim();
  }
  return String(parsed?.reply || parsed?.result?.reply || '').trim();
}

async function main() {
  await ensureDir();
  const state = await loadState();
  const data = await fetchData();

  const dataHash = sha(JSON.stringify(data));
  if (dataHash === state.lastHash) {
    console.log('No source changes, skip brief update.');
    return;
  }

  const analyzedLeadMap = state.analyzed?.leads || {};
  const analyzedInterviewMap = state.analyzed?.interviews || {};

  const newLeadsForAnalysis = data.newLeads.filter((r) => !analyzedLeadMap[keyOf(r)]);
  const updatedLeadsForAnalysis = data.updatedLeads.filter((r) => !analyzedLeadMap[keyOf(r)]);
  const interviewsForAnalysis = data.newInterviews.filter((r) => !analyzedInterviewMap[keyOf(r)]);

  if (!newLeadsForAnalysis.length && !updatedLeadsForAnalysis.length && !interviewsForAnalysis.length) {
    state.lastHash = dataHash;
    state.updatedAt = new Date().toISOString();
    await saveState(state);
    console.log('Source changed but no new unanalyzed entities, skip brief generation.');
    return;
  }

  const summaryMd = await summarizeWithAgent({
    generatedAt: new Date().toISOString(),
    newLeads: newLeadsForAnalysis,
    updatedLeads: updatedLeadsForAnalysis,
    newInterviews: interviewsForAnalysis,
    totals: {
      newLeads: data.newLeads.length,
      updatedLeads: data.updatedLeads.length,
      newInterviews: data.newInterviews.length,
    },
  });

  const filename = `${ts()}.md`;
  const filePath = path.join(BRIEF_DIR, filename);
  const header = [
    `# Brief ${filename.replace('.md', '').replace('_', ' ')}`,
    '',
    `- Generated At (UTC): ${new Date().toISOString()}`,
    `- Agent: ${AGENT_ID}`,
    `- New Leads scanned: ${data.newLeads.length}`,
    `- New Interviews scanned: ${data.newInterviews.length}`,
    `- Updated Leads scanned: ${data.updatedLeads.length}`,
    '',
  ].join('\n');

  await fs.writeFile(filePath, `${header}\n${summaryMd}\n`, 'utf8');

  for (const r of newLeadsForAnalysis) analyzedLeadMap[keyOf(r)] = true;
  for (const r of updatedLeadsForAnalysis) analyzedLeadMap[keyOf(r)] = true;
  for (const r of interviewsForAnalysis) analyzedInterviewMap[keyOf(r)] = true;

  state.analyzed = { leads: analyzedLeadMap, interviews: analyzedInterviewMap };
  state.lastHash = dataHash;
  state.lastFile = filename;
  state.updatedAt = new Date().toISOString();

  await saveState(state);
  console.log(`Brief generated: ${filePath}`);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || e);
  process.exit(1);
});
