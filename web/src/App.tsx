import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon, Anchor, AppShell, Avatar, Badge, Box, Button, Card, Checkbox, Divider, Group, Modal, NumberInput, Paper, ScrollArea, Select, Slider,
  SimpleGrid, Stack, Table, Tabs, Text, TextInput, Textarea, Title, Tooltip, useMantineColorScheme,
} from '@mantine/core';
import { IconActivity, IconArrowDown, IconArrowUp, IconBolt, IconBrain, IconEdit, IconFilter, IconGauge, IconLock, IconMessageCircle, IconMoonStars, IconSend, IconSun, IconTrash, IconWorld, IconNotes, IconDownload } from '@tabler/icons-react';

type Lead = {
  id: number; name: string; region?: string; vertical: string; source: string;
  tidb_potential_score: number | null; tidb_potential_reason: string; lead_status: string; owner: string;
  manual_locked: number; creator?: string; created_at?: string; updated_at?: string; funding?: string; linkedin?: string;
  emails?: string | null;
  latest_news?: string; manual_note?: string; tags?: string; source_confidence?: number | null; enrich_status?: string;
};

type DashboardPayload = {
  total: number; locked: number; avgScore: number;
  statusRows: Array<{ lead_status: string; c: number }>;
  topRows: Array<Pick<Lead, 'id' | 'name' | 'tidb_potential_score' | 'lead_status' | 'manual_locked'>>;
  dailyTrend?: Array<{ d: string; c: number }>;
  scoreBuckets?: Array<{ bucket: string; c: number }>;
  enrichRows?: Array<{ enrich_status: string; c: number }>;
};

type EnrichJob = { id: number; lead_id: number; status: string; attempts: number; last_error?: string; updated_at?: string; name?: string; enrich_status?: string; };

type Interview = {
  id: number;
  lead_id: number;
  title: string;
  interview_date: string;
  channel: string;
  interviewer?: string | null;
  company?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  summary?: string | null;
  pain_points?: string | null;
  current_solution?: string | null;
  requirements?: string | null;
  objections_risks?: string | null;
  next_steps?: string | null;
  tags?: string | null;
  transcript_html?: string | null;
  transcript_plain?: string | null;
  updated_at?: string;
};
type EnrichPayload = { rows: EnrichJob[]; stats: { pending: number; running: number; done_count: number; failed: number } };

type OutreachEmailSend = {
  id?: number;
  lead_id: number;
  email: string;
  sent_at: string;
  subject?: string | null;
  sender?: string | null;
  content?: string | null;
};

type ChartPayload = { type: 'pie' | 'line' | 'bar'; title?: string; labels: string[]; values: number[] };

type ChatTurn = { role: 'user' | 'assistant'; text: string; rows?: Lead[]; chart?: ChartPayload };
type AgentSession = { id: string; name: string; updatedAt: number; turns: ChatTurn[] };

type SavedView = {
  name: string;
  q: string;
  minScore: number;
  status: string | null;
  region: string;
  lockedOnly: boolean;
};

const I18N = {
  zh: {
    title: 'PingComp', subtitle: '潜在客户人工清洗与标注', agent: 'Agent', dashboard: '仪表盘', leads: '线索管理', interviews: '访谈记录', enrich: 'Enrich 队列', outreach: '触达中心', emails: '触达邮件', leadId: '线索ID', email: '邮箱', from: '起始', to: '截止', sentAt: '发送时间', subject: '标题', sender: '发送方', content: '内容', apply: '应用', reset: '重置', loading: '加载中…',
    filter: '筛选', reset: '重置', search: '搜索 name/owner/vertical/source/tags', minScore: '最低分', status: '状态', region: '国家/地区', creator: 'Creator', page: '页码', pageSize: '每页条数',
    lockOnly: '仅锁定', prev: '上一页', next: '下一页', edit: '编辑', saveLock: '保存并锁定', total: '总线索',
    locked: '人工锁定', avg: '平均分', lockRate: '锁定占比', exportCsv: '导出CSV', runBatch: '执行一轮(20条)',
    enqueue: '入队', noData: '暂无数据', loading: '加载中…', trend7d: '近7天更新趋势', scoreDist: '评分分布', enrichDist: 'Enrich状态',
    bulkAction: '批量动作', apply: '执行', selected: '已选', quickViews: '快捷视图', savedViews: '已保存视图', saveView: '保存当前视图', deleteView: '删除视图', viewName: '视图名', account: '账户', logout: '退出', delete: '删除', deleteConfirm: '确认删除该线索？', deleteModalTitle: '确认删除', deleteModalDesc: '删除后不可恢复，请确认操作。', cancel: '取消', confirmDelete: '确认删除', askAgent: '问问 Agent', askPlaceholder: '例如：找出 owner 为某人、分数大于80的客户', sessions: '会话', newSession: '新建会话', deleteSession: '删除会话', sessionName: '会话名称',
  },
  en: {
    title: 'PingComp', subtitle: 'Lead ops workspace', agent: 'Agent', dashboard: 'Dashboard', leads: 'Leads', interviews: 'Interviews', enrich: 'Enrich Queue', outreach: 'Outreach Center', emails: 'Emails', leadId: 'Lead ID', email: 'Email', from: 'From', to: 'To', sentAt: 'Sent At', subject: 'Subject', sender: 'Sender', content: 'Content', apply: 'Apply', reset: 'Reset', loading: 'loading…',
    filter: 'Filter', reset: 'Reset', search: 'Search name/owner/vertical/source/tags', minScore: 'Min score', status: 'Status', region: 'Country/Region', creator: 'Creator', pageSize: 'Page size',
    page: 'Page', lockOnly: 'Locked only', prev: 'Prev', next: 'Next', edit: 'Edit', saveLock: 'Save & lock', total: 'Total leads',
    locked: 'Manual locked', avg: 'Avg score', lockRate: 'Lock ratio', exportCsv: 'Export CSV', runBatch: 'Run batch (20)',
    enqueue: 'Enqueue', noData: 'No data', loading: 'Loading…', trend7d: '7-day update trend', scoreDist: 'Score distribution', enrichDist: 'Enrich status',
    bulkAction: 'Bulk action', apply: 'Apply', selected: 'Selected', quickViews: 'Quick views', savedViews: 'Saved views', saveView: 'Save current view', deleteView: 'Delete view', viewName: 'View name', account: 'Account', logout: 'Logout', delete: 'Delete', deleteConfirm: 'Delete this lead?', deleteModalTitle: 'Confirm deletion', deleteModalDesc: 'This operation cannot be undone.', cancel: 'Cancel', confirmDelete: 'Delete', askAgent: 'Ask Agent', askPlaceholder: 'e.g. find leads with score >= 80 and a specific owner', sessions: 'Sessions', newSession: 'New Session', deleteSession: 'Delete Session', sessionName: 'Session Name',
  },
} as const;

function useLocalLang() {
  const [lang, setLangState] = useState<'zh' | 'en'>(() => (localStorage.getItem('pingcomp_lang') === 'en' ? 'en' : 'zh'));
  const setLang = (v: 'zh' | 'en') => { localStorage.setItem('pingcomp_lang', v); setLangState(v); };
  return { lang, setLang };
}

const scoreColor = (v: number) => (v >= 75 ? 'green' : v >= 50 ? 'yellow' : 'red');


function PieMini({ labels, values }: { labels: string[]; values: number[] }) {
  const total = Math.max(values.reduce((a, b) => a + b, 0), 1);
  const colors = ['#4f8cff','#7c5cff','#22c55e','#f59e0b','#ef4444','#14b8a6','#a855f7','#64748b','#eab308','#10b981'];
  let acc = 0;
  const stops = values.map((v, i) => {
    const start = (acc / total) * 100;
    acc += v;
    const end = (acc / total) * 100;
    return `${colors[i % colors.length]} ${start}% ${end}%`;
  }).join(', ');
  return (
    <Group align="flex-start" gap="md" wrap="wrap">
      <Box w={150} h={150} style={{ borderRadius: '50%', background: `conic-gradient(${stops || '#334155 0 100%'})`, border: '1px solid rgba(148,163,184,.35)' }} />
      <Stack gap={4}>
        {labels.map((l, i) => (
          <Group key={l + i} gap={6}><Box w={10} h={10} style={{ borderRadius: 2, background: colors[i % colors.length] }} /><Text size="xs">{l}: {values[i] ?? 0}</Text></Group>
        ))}
      </Stack>
    </Group>
  );
}

function LineMini({ labels, values }: { labels: string[]; values: number[] }) {
  const w = 520, h = 170, p = 20;
  const max = Math.max(...values, 1);
  const sx = (i: number) => p + (i * (w - 2 * p)) / Math.max(values.length - 1, 1);
  const sy = (v: number) => h - p - (v * (h - 2 * p)) / max;
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${sy(v)}`).join(' ');
  return (
    <Box>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }}>
        <path d={d} fill="none" stroke="#60a5fa" strokeWidth="2.5" />
        {values.map((v, i) => <circle key={i} cx={sx(i)} cy={sy(v)} r="2.8" fill="#93c5fd" />)}
      </svg>
      <Group gap={8} wrap="wrap">
        {labels.map((l, i) => <Text key={l + i} size="xs" c="dimmed">{l}:{values[i] ?? 0}</Text>)}
      </Group>
    </Box>
  );
}

function BarMini({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <Stack gap={6}>
      {labels.map((l, i) => (
        <Box key={l + i}>
          <Group justify="space-between" mb={2}><Text size="xs">{l}</Text><Text size="xs" fw={600}>{values[i] ?? 0}</Text></Group>
          <Box h={8} bg="dark.4" style={{ borderRadius: 999, overflow: 'hidden' }}>
            <Box h="100%" w={`${Math.max(4, ((values[i] ?? 0) / max) * 100)}%`} bg="#60a5fa" style={{ borderRadius: 999 }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function TrendSparkline({ data }: { data: Array<{ d: string; c: number }> }) {
  if (!data?.length) return <Text size="sm" c="dimmed">-</Text>;
  const w = 340, h = 90, p = 10;
  const max = Math.max(...data.map(x => x.c), 1);
  const min = Math.min(...data.map(x => x.c), 0);
  const sx = (i: number) => p + (i * (w - 2 * p)) / Math.max(data.length - 1, 1);
  const sy = (v: number) => h - p - ((v - min) * (h - 2 * p)) / Math.max(max - min, 1);
  const d = data.map((x, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${sy(x.c)}`).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.9" />
      {data.map((x, i) => <circle key={i} cx={sx(i)} cy={sy(x.c)} r="2.5" />)}
    </svg>
  );
}

function HorizontalBars({ rows }: { rows: Array<{ k: string; v: number }> }) {
  if (!rows.length) return <Text size="sm" c="dimmed">-</Text>;
  const max = Math.max(...rows.map(r => r.v), 1);
  return (
    <Stack gap={8}>
      {rows.map((r) => (
        <Box key={r.k}>
          <Group justify="space-between" mb={4}><Text size="sm">{r.k}</Text><Text size="sm" fw={600}>{r.v}</Text></Group>
          <Box h={8} bg="dark.4" style={{ borderRadius: 999, overflow: 'hidden' }}>
            <Box h="100%" w={`${Math.max(6, (r.v / max) * 100)}%`} bg="blue.6" style={{ borderRadius: 999 }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

export function App() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { lang, setLang } = useLocalLang();
  const t = I18N[lang];

  const [tab, setTab] = useState<string | null>(() => localStorage.getItem('pingcomp_tab') || 'agent');
  const [rows, setRows] = useState<Lead[]>([]);
  const [q, setQ] = useState('');
  const [minScore, setMinScore] = useState<number>(0);
  const [status, setStatus] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [regionOptions, setRegionOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [regionSearch, setRegionSearch] = useState('');
  const [regionLoading, setRegionLoading] = useState(false);
  const [lockedOnly, setLockedOnly] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<string>('15');
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [agentInput, setAgentInput] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentComposing, setAgentComposing] = useState(false);
  const defaultAgentTurns: ChatTurn[] = [{ role: 'assistant', text: '我是 PingComp Agent。你可以自然语言问我潜在客户数据，例如："分数大于80且已锁定"。' }];
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>(() => {
    try {
      const raw = localStorage.getItem('pingcomp_agent_sessions');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr) && arr.length) return arr;
    } catch {}
    return [{ id: `s_${Date.now()}`, name: 'Session 1', updatedAt: Date.now(), turns: defaultAgentTurns }];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const saved = localStorage.getItem('pingcomp_agent_current_session');
    return saved || '';
  });
  const currentSession = useMemo(() => {
    if (!agentSessions.length) return null;
    return agentSessions.find(s => s.id === currentSessionId) || agentSessions[0];
  }, [agentSessions, currentSessionId]);
  const agentTurns = currentSession?.turns || defaultAgentTurns;
  const [dash, setDash] = useState<DashboardPayload | null>(null);
  const [enrich, setEnrich] = useState<EnrichPayload | null>(null);
  const [enqueueIds, setEnqueueIds] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    try { return JSON.parse(localStorage.getItem('pingcomp_saved_views') || '[]'); } catch { return []; }
  });
  const [selectedSavedView, setSelectedSavedView] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState('');
  const [recentEditedIds, setRecentEditedIds] = useState<Set<number>>(new Set());
  const [me, setMe] = useState<{ name?: string; email?: string; picture?: string } | null>(null);
  const [sortKey, setSortKey] = useState<'id'|'name'|'score'|'lead_status'|'owner'|'vertical'|'created_at'|'updated_at'>('updated_at');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [deleteCtx, setDeleteCtx] = useState<{ ids: number[]; mode: 'single' | 'bulk' } | null>(null);

  // Interviews
  const [interviewsTabQ, setInterviewsTabQ] = useState('');
  const [interviewsTabLeadId, setInterviewsTabLeadId] = useState<string>('');
  const [interviewsTabChannel, setInterviewsTabChannel] = useState<string>('');
  const [interviewsTabInterviewer, setInterviewsTabInterviewer] = useState<string>('');
  const [interviewsTabTags, setInterviewsTabTags] = useState<string>('');
  const [interviewsTabDatePreset, setInterviewsTabDatePreset] = useState<string>('last30');
  const [interviewsTabDateFrom, setInterviewsTabDateFrom] = useState<string>('');
  const [interviewsTabDateTo, setInterviewsTabDateTo] = useState<string>('');
  const [interviewsRows, setInterviewsRows] = useState<Interview[]>([]);
  const [interviewsCursor, setInterviewsCursor] = useState<string | null>(null);
  const [interviewsLoading, setInterviewsLoading] = useState(false);

  // Outreach Center
  const [outreachLeadId, setOutreachLeadId] = useState<string>('');
  const [outreachEmail, setOutreachEmail] = useState<string>('');
  const [outreachFrom, setOutreachFrom] = useState<string>('');
  const [outreachTo, setOutreachTo] = useState<string>('');
  const [outreachRows, setOutreachRows] = useState<OutreachEmailSend[]>([]);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachExpanded, setOutreachExpanded] = useState<Set<number>>(new Set());

  const [leadInterviewsCtx, setLeadInterviewsCtx] = useState<{ lead: Lead } | null>(null);
  const [leadInterviewsRows, setLeadInterviewsRows] = useState<Interview[]>([]);
  const [leadInterviewsCursor, setLeadInterviewsCursor] = useState<string | null>(null);
  const [leadInterviewsLoading, setLeadInterviewsLoading] = useState(false);
  const leadInterviewsLoadSeq = useRef(0);

  const [editInterviewCtx, setEditInterviewCtx] = useState<{ mode: 'create' | 'edit'; leadId: number; row?: Interview } | null>(null);
  const [editInterviewDraft, setEditInterviewDraft] = useState<any>(null);

  const statusOptions = useMemo(() => [
    { value: 'new', label: 'new' }, { value: 'contacted', label: 'contacted' },
    { value: 'qualified', label: 'qualified' }, { value: 'disqualified', label: 'disqualified' },
  ], []);

  const bulkOptions = useMemo(() => [
    { value: 'lock', label: 'lock' },
    { value: 'unlock', label: 'unlock' },
    { value: 'status:new', label: 'status:new' },
    { value: 'status:contacted', label: 'status:contacted' },
    { value: 'status:qualified', label: 'status:qualified' },
    { value: 'status:disqualified', label: 'status:disqualified' },
    { value: 'delete', label: 'delete' },
  ], []);

  async function loadLeads(pageOverride?: number) {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (minScore > 0) params.set('minScore', String(minScore));
    if (status) params.set('status', status);
    if ((region || '').trim()) params.set('region', (region || '').trim());
    if (lockedOnly) params.set('locked', '1');
    const activePage = pageOverride ?? page;
    params.set('page', String(activePage));
    params.set('pageSize', String(Number(pageSize) || 15));
    const sortMap: Record<string, string> = {
      id: 'id', name: 'name', score: 'score', lead_status: 'status', owner: 'owner', vertical: 'vertical', created_at: 'created', updated_at: 'updated'
    };
    params.set('sort', `${sortMap[sortKey] || 'updated'}_${sortDir}`);
    const r = await fetch(`/api/leads?${params.toString()}`);
    const j = await r.json();
    setRows(j.rows || []); setTotalPages(j.totalPages || 1); setTotalRows(j.total || 0); setLoading(false);
    setSelectedIds(new Set());
  }

  async function loadDashboard() { const r = await fetch('/api/dashboard'); setDash(await r.json()); }
  async function loadEnrich() { const r = await fetch('/api/enrich/queue'); setEnrich(await r.json()); }

  async function loadInterviews(opts?: { reset?: boolean }) {
    if (interviewsLoading) return;
    setInterviewsLoading(true);
    try {
      const params = new URLSearchParams();
      if (interviewsTabQ.trim()) params.set('q', interviewsTabQ.trim());
      if (interviewsTabLeadId.trim()) params.set('leadId', interviewsTabLeadId.trim());
      if (interviewsTabChannel.trim()) params.set('channel', interviewsTabChannel.trim());
      if (interviewsTabInterviewer.trim()) params.set('interviewer', interviewsTabInterviewer.trim());
      if (interviewsTabTags.trim()) {
        const parts = interviewsTabTags.split(',').map(s => s.trim()).filter(Boolean);
        for (const p of parts) params.append('tags', p);
      }
      if (interviewsTabDatePreset) params.set('datePreset', interviewsTabDatePreset);
      if (interviewsTabDateFrom.trim()) params.set('dateFrom', interviewsTabDateFrom.trim());
      if (interviewsTabDateTo.trim()) params.set('dateTo', interviewsTabDateTo.trim());
      params.set('limit', '50');
      if (!opts?.reset && interviewsCursor) params.set('cursor', interviewsCursor);

      const r = await fetch(`/api/interviews?${params.toString()}`);
      const j = await r.json();
      const next = (j.rows || []) as Interview[];
      setInterviewsRows(opts?.reset ? next : [...interviewsRows, ...next]);
      setInterviewsCursor(j.nextCursor || null);
    } finally {
      setInterviewsLoading(false);
    }
  }

  async function loadOutreachSends() {
    if (outreachLoading) return;
    setOutreachLoading(true);
    try {
      const params = new URLSearchParams();
      if (outreachLeadId.trim()) params.set('leadId', outreachLeadId.trim());
      if (outreachEmail.trim()) params.set('email', outreachEmail.trim().toLowerCase());
      if (outreachFrom.trim()) params.set('from', outreachFrom.trim());
      if (outreachTo.trim()) params.set('to', outreachTo.trim());
      params.set('limit', '200');

      const r = await fetch('/api/outreach/email-sends?' + params.toString());
      const j = await r.json();
      setOutreachRows((j.rows || []) as OutreachEmailSend[]);
    } finally {
      setOutreachLoading(false);
    }
  }

  async function loadLeadInterviews(opts?: { reset?: boolean; leadId?: number }) {
    const activeLeadId = opts?.leadId || leadInterviewsCtx?.lead.id;
    if (!activeLeadId) return;
    const seq = ++leadInterviewsLoadSeq.current;
    setLeadInterviewsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('leadId', String(activeLeadId));
      params.set('limit', '50');
      if (!opts?.reset && leadInterviewsCursor) params.set('cursor', leadInterviewsCursor);
      const r = await fetch(`/api/interviews?${params.toString()}`);
      const j = await r.json();
      const next = (j.rows || []) as Interview[];
      if (seq !== leadInterviewsLoadSeq.current) return;
      setLeadInterviewsRows(opts?.reset ? next : [...leadInterviewsRows, ...next]);
      setLeadInterviewsCursor(j.nextCursor || null);
    } finally {
      if (seq === leadInterviewsLoadSeq.current) setLeadInterviewsLoading(false);
    }
  }

  function toInterviewDraft(it: Interview) {
    return {
      title: it.title,
      interviewDate: it.interview_date,
      channel: it.channel,
      interviewer: it.interviewer || '',
      company: it.company || '',
      contactName: it.contact_name || '',
      contactRole: it.contact_role || '',
      tags: (it.tags || ''),
      summary: it.summary || '',
      painPoints: it.pain_points || '',
      currentSolution: it.current_solution || '',
      requirements: it.requirements || '',
      objectionsRisks: it.objections_risks || '',
      nextSteps: it.next_steps || '',
      transcriptHtml: it.transcript_html || '',
    };
  }

  async function openInterviewEditor(it: Interview) {
    let detail = it;
    try {
      const r = await fetch(`/api/interviews/${it.id}`);
      if (r.ok) {
        const j = await r.json();
        if (j?.row) detail = j.row as Interview;
      }
    } catch {}

    setEditInterviewCtx({ mode: 'edit', leadId: detail.lead_id || it.lead_id, row: detail });
    setEditInterviewDraft(toInterviewDraft(detail));
  }

  async function loadRegions(q = '') {
    setRegionLoading(true);
    try {
      const r = await fetch(`/api/regions?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      setRegionOptions((j.rows || []).map((x: any) => ({ value: x.value, label: x.label })));
    } finally {
      setRegionLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'dashboard') loadDashboard();
    if (tab === 'enrich') loadEnrich();
    if (tab === 'leads') { loadLeads(); loadRegions(''); }
    if (tab === 'outreach') { loadOutreachSends(); }
    if (tab === 'interviews') { setInterviewsCursor(null); loadInterviews({ reset: true }); }
  }, [tab]);

  useEffect(() => {
    const leadId = leadInterviewsCtx?.lead.id;
    if (!leadId) return;
    setLeadInterviewsRows([]);
    setLeadInterviewsCursor(null);
    loadLeadInterviews({ reset: true, leadId });
  }, [leadInterviewsCtx?.lead.id]);

  useEffect(() => {
    if (tab !== 'leads') return;
    const h = window.setTimeout(() => {
      setPage(1);
      loadLeads(1);
    }, 320);
    return () => window.clearTimeout(h);
  }, [q, minScore, status, region, lockedOnly, sortKey, sortDir, pageSize, tab]);

  useEffect(() => {
    if (tab !== 'leads') return;
    loadLeads();
  }, [page]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(j => setMe(j?.user || null)).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (tab !== 'leads') return;
    const h = window.setTimeout(() => loadRegions(regionSearch), 260);
    return () => window.clearTimeout(h);
  }, [regionSearch, tab]);


  useEffect(() => {
    if (tab) localStorage.setItem('pingcomp_tab', tab);
  }, [tab]);

  useEffect(() => {
    if (!agentSessions.length) return;
    localStorage.setItem('pingcomp_agent_sessions', JSON.stringify(agentSessions));
    const active = currentSessionId || agentSessions[0].id;
    localStorage.setItem('pingcomp_agent_current_session', active);
  }, [agentSessions, currentSessionId]);



  async function askAgent() {
    const q = agentInput.trim();
    if (!q || agentLoading) return;
    const sid = currentSession?.id;
    if (!sid) return;
    setAgentSessions(prev => prev.map(ss => ss.id === sid ? { ...ss, updatedAt: Date.now(), turns: [...ss.turns, { role: 'user', text: q }] } : ss));
    setAgentInput('');
    setAgentLoading(true);
    try {
      const r = await fetch('/api/agent/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: q })
      });
      const j = await r.json();
      setAgentSessions(prev => prev.map(ss => ss.id === currentSession?.id ? { ...ss, updatedAt: Date.now(), turns: [...ss.turns, { role: 'assistant', text: j.reply || 'Done', rows: j.rows || [], chart: j.chart || undefined }] } : ss));
    } catch (e: any) {
      setAgentSessions(prev => prev.map(ss => ss.id === currentSession?.id ? { ...ss, updatedAt: Date.now(), turns: [...ss.turns, { role: 'assistant', text: `请求失败：${e?.message || e}` }] } : ss));
    } finally {
      setAgentLoading(false);
    }
  }


  function createSession() {
    const id = `s_${Date.now()}`;
    const next: AgentSession = { id, name: `Session ${agentSessions.length + 1}`, updatedAt: Date.now(), turns: defaultAgentTurns };
    setAgentSessions(prev => [next, ...prev]);
    setCurrentSessionId(id);
  }

  function deleteCurrentSession() {
    if (!currentSession) return;
    const ok = window.confirm('Delete current session?');
    if (!ok) return;
    setAgentSessions(prev => {
      const next = prev.filter(x => x.id !== currentSession.id);
      if (!next.length) {
        const seed: AgentSession = { id: `s_${Date.now()}`, name: 'Session 1', updatedAt: Date.now(), turns: defaultAgentTurns };
        setCurrentSessionId(seed.id);
        return [seed];
      }
      setCurrentSessionId(next[0].id);
      return next;
    });
  }

  async function saveLead() {
    if (!selected) return;

    // emails are persisted via dedicated endpoint (normalizes comma/newline separated input)
    const emailParts = String((selected as any).emails || '')
      .split(/[,\n]+/g)
      .map(s => s.trim())
      .filter(Boolean);
    await fetch(`/api/leads/${selected.id}/emails`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: emailParts }),
    });

    await fetch(`/api/leads/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selected) });
    setSelected(null);
    markRecentEdited([selected.id]);
    await Promise.all([loadLeads(), loadDashboard()]);
  }

  async function applyBulk() {
    if (!bulkAction || selectedIds.size === 0) return;
    if (bulkAction === 'delete') {
      setDeleteCtx({ ids: [...selectedIds], mode: 'bulk' });
      return;
    }
    await fetch('/api/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedIds].join(','), action: bulkAction }),
    });
    markRecentEdited([...selectedIds]);
    await Promise.all([loadLeads(), loadDashboard()]);
  }

  async function applyQuickView(kind: 'high' | 'locked' | 'followup' | 'all') {
    if (kind === 'high') {
      setQ(''); setMinScore(80); setStatus('new'); setRegion(null); setLockedOnly(false);
    } else if (kind === 'locked') {
      setQ(''); setMinScore(0); setStatus(null); setRegion(null); setLockedOnly(true);
    } else if (kind === 'followup') {
      setQ(''); setMinScore(0); setStatus('contacted'); setRegion(null); setLockedOnly(false);
    } else {
      setQ(''); setMinScore(0); setStatus(null); setRegion(null); setLockedOnly(false);
    }
    setPage(1);
  }


  function persistViews(next: SavedView[]) {
    setSavedViews(next);
    localStorage.setItem('pingcomp_saved_views', JSON.stringify(next));
  }

  function saveCurrentView() {
    const name = newViewName.trim();
    if (!name) return;
    const view: SavedView = { name, q, minScore, status, region, lockedOnly };
    const next = [view, ...savedViews.filter(v => v.name !== name)].slice(0, 12);
    persistViews(next);
    setSelectedSavedView(name);
    setNewViewName('');
  }

  function applySavedView(name: string | null) {
    setSelectedSavedView(name);
    const v = savedViews.find(x => x.name === name);
    if (!v) return;
    setQ(v.q); setMinScore(v.minScore); setStatus(v.status); setRegion(v.region || null); setLockedOnly(v.lockedOnly);
    setPage(1);
  }

  function deleteSavedView() {
    if (!selectedSavedView) return;
    const next = savedViews.filter(v => v.name !== selectedSavedView);
    persistViews(next);
    setSelectedSavedView(null);
  }

  function markRecentEdited(ids: number[]) {
    if (!ids.length) return;
    setRecentEditedIds(prev => {
      const n = new Set(prev);
      ids.forEach(id => n.add(id));
      return n;
    });
    window.setTimeout(() => {
      setRecentEditedIds(prev => {
        const n = new Set(prev);
        ids.forEach(id => n.delete(id));
        return n;
      });
    }, 120000);
  }


  function requestDeleteOne(id: number) {
    setDeleteCtx({ ids: [id], mode: 'single' });
  }

  async function confirmDelete() {
    if (!deleteCtx) return;
    if (deleteCtx.mode === 'single') {
      await fetch(`/api/leads/${deleteCtx.ids[0]}`, { method: 'DELETE' });
    } else {
      await fetch('/api/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deleteCtx.ids.join(','), action: 'delete' }),
      });
    }
    markRecentEdited(deleteCtx.ids);
    setDeleteCtx(null);
    await Promise.all([loadLeads(), loadDashboard()]);
  }

  async function runEnrichBatch() { await fetch('/api/enrich/run', { method: 'POST' }); await loadEnrich(); }
  async function enqueue() { await fetch('/api/enrich/enqueue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: enqueueIds }) }); setEnqueueIds(''); await loadEnrich(); }

  const sortedRows = rows;

  const setSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const thStyle: any = {
    background: 'rgba(18,24,39,0.95)',
    color: '#dbe7ff',
    borderBottom: '1px solid rgba(120,140,180,0.45)',
  };

  const SortHead = ({ label, k, w }: { label: string; k: typeof sortKey; w?: number }) => (
    <Table.Th w={w} style={thStyle}>
      <Group gap={4} wrap="nowrap" style={{ cursor: 'pointer' }} onClick={() => setSort(k)}>
        <Text size="sm" fw={600}>{label}</Text>
        {sortKey === k ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : null}
      </Group>
    </Table.Th>
  );

  const allChecked = sortedRows.length > 0 && sortedRows.every(r => selectedIds.has(r.id));

  return (
    <AppShell padding="md">
      <Stack gap="md">
        <Paper withBorder p="md" radius="md" style={{ backdropFilter: 'blur(8px)', boxShadow: '0 0 40px rgba(64,128,255,0.08) inset', borderColor: colorScheme === 'dark' ? 'rgba(120,140,180,0.45)' : undefined }}>
          <Group justify="space-between" align="center">
            <Group>
              <img src="/logo.svg" alt="PingComp" width={45} height={45} />
              <Stack gap={0}>
                <Title order={2} fw={800}>{t.title}</Title>
                <Text size="sm" c="dimmed">{t.subtitle}</Text>
              </Stack>
            </Group>
            <Group>
              <Select w={110} data={[{ value: 'zh', label: '中文' }, { value: 'en', label: 'EN' }]} value={lang} onChange={(v) => setLang((v as 'zh' | 'en') || 'zh')} leftSection={<IconWorld size={14} />} />
              <Select
                w={145}
                data={[{ value: 'auto', label: 'system' }, { value: 'dark', label: 'dark' }, { value: 'light', label: 'light' }]}
                value={colorScheme === 'auto' ? 'auto' : colorScheme}
                onChange={(v) => setColorScheme((v as any) || 'auto')}
                leftSection={colorScheme === 'light' ? <IconSun size={14} /> : <IconMoonStars size={14} />}
              />
              {me ? (
                <Group gap={8}>
                  <Avatar src={me.picture} size={24} radius="xl" />
                  <Text size="sm" c="dimmed">{me.name || me.email}</Text>
                  <Button component="a" href="/logout" variant="subtle" size="xs">{t.logout}</Button>
                </Group>
              ) : null}
              <Button component="a" href="/api/export.csv" variant="light">{t.exportCsv}</Button>
            </Group>
          </Group>
        </Paper>

        <Tabs value={tab} onChange={setTab}>
          <Tabs.List>
            <Tabs.Tab value="agent" leftSection={<IconMessageCircle size={14} />}>{t.agent}</Tabs.Tab>
            <Tabs.Tab value="leads" leftSection={<IconBrain size={14} />}>{t.leads}</Tabs.Tab>
            <Tabs.Tab value="outreach" leftSection={<IconActivity size={14} />}>{(t as any).outreach || 'Outreach Center'}</Tabs.Tab>
            <Tabs.Tab value="interviews" leftSection={<IconNotes size={14} />}>{t.interviews}</Tabs.Tab>
            <Tabs.Tab value="enrich" leftSection={<IconBolt size={14} />}>{t.enrich}</Tabs.Tab>
            <Tabs.Tab value="dashboard" leftSection={<IconGauge size={14} />}>{t.dashboard}</Tabs.Tab>
          </Tabs.List>


          <Tabs.Panel value="agent" pt="md">
            <Box px="xs" style={{ minHeight: "calc(100vh - 210px)" }}>
              <Paper withBorder p="md" radius="md" style={{ borderColor: colorScheme === 'dark' ? 'rgba(120,140,180,0.35)' : undefined, minHeight: "calc(100vh - 230px)", display: "flex", flexDirection: "column" }}>
                <Stack gap="sm" style={{ flex: 1 }}>
                  <Group justify="space-between" wrap="wrap">
                    <Group>
                      <Text size="sm" c="dimmed">{t.sessions}</Text>
                      <Select w={220} data={agentSessions.map(s0 => ({ value: s0.id, label: s0.name }))} value={currentSession?.id || null} onChange={(v) => setCurrentSessionId(v || '')} />
                    </Group>
                    <Group>
                      <Button size="xs" variant="default" onClick={createSession}>{t.newSession}</Button>
                      <Button size="xs" color="red" variant="light" onClick={deleteCurrentSession}>{t.deleteSession}</Button>
                    </Group>
                  </Group>
                  <ScrollArea style={{ flex: 1 }} offsetScrollbars scrollbarSize={10}>
                    <Stack gap="sm" pr="sm">
                      {agentTurns.map((t0, i) => (
                        <Paper key={i} p="sm" radius="md" withBorder style={{ alignSelf: t0.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%', background: t0.role === 'user' ? (colorScheme === 'dark' ? 'rgba(59,130,246,.22)' : 'rgba(59,130,246,.12)') : undefined }}>
                          <Text size="sm">{t0.text}</Text>
                          {t0.chart ? (
                            <Paper mt="xs" p="sm" withBorder radius="sm">
                              <Text size="xs" fw={700} mb={6}>{t0.chart.title || 'Chart'}</Text>
                              {t0.chart.type === 'pie' ? (
                                <PieMini labels={t0.chart.labels || []} values={t0.chart.values || []} />
                              ) : t0.chart.type === 'line' ? (
                                <LineMini labels={t0.chart.labels || []} values={t0.chart.values || []} />
                              ) : (
                                <BarMini labels={t0.chart.labels || []} values={t0.chart.values || []} />
                              )}
                            </Paper>
                          ) : null}
                          {t0.rows && t0.rows.length > 0 ? (
                            <ScrollArea mt="xs">
                              <Table withTableBorder withColumnBorders verticalSpacing="xs" miw={760}>
                                <Table.Thead><Table.Tr><Table.Th>ID</Table.Th><Table.Th>Name</Table.Th><Table.Th>Owner</Table.Th><Table.Th>Score</Table.Th><Table.Th>Status</Table.Th><Table.Th>Locked</Table.Th></Table.Tr></Table.Thead>
                                <Table.Tbody>
                                  {t0.rows.slice(0, 20).map(r => (
                                    <Table.Tr key={r.id}><Table.Td style={{ paddingTop: 6, paddingBottom: 6 }}>{r.id}</Table.Td><Table.Td>{r.name}</Table.Td><Table.Td style={{ paddingTop: 6, paddingBottom: 6 }}>{r.owner || '-'}</Table.Td><Table.Td>{r.tidb_potential_score ?? '-'}</Table.Td><Table.Td style={{ paddingTop: 6, paddingBottom: 6 }}>{r.lead_status}</Table.Td><Table.Td>{r.manual_locked ? 'Y' : '-'}</Table.Td></Table.Tr>
                                  ))}
                                </Table.Tbody>
                              </Table>
                            </ScrollArea>
                          ) : null}
                        </Paper>
                      ))}
                    </Stack>
                  </ScrollArea>
                  <Group align="end">
                    <TextInput
                      style={{ flex: 1 }}
                      placeholder={t.askPlaceholder}
                      value={agentInput}
                      onChange={(e) => setAgentInput(e.currentTarget.value)}
                      onCompositionStart={() => setAgentComposing(true)}
                      onCompositionEnd={() => setAgentComposing(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !agentComposing && !(e.nativeEvent as any)?.isComposing) askAgent();
                      }}
                    />
                    <Button leftSection={<IconSend size={14} />} loading={agentLoading} onClick={askAgent}>{t.askAgent}</Button>
                  </Group>
                </Stack>
              </Paper>
            </Box>
          </Tabs.Panel>


          <Tabs.Panel value="leads" pt="md">
            <Box px="xs">
              <Paper withBorder p="md" radius="md" style={{ borderColor: colorScheme === 'dark' ? 'rgba(120,140,180,0.35)' : undefined }}>
                <Group wrap="wrap" align="end">
                  <TextInput leftSection={<IconFilter size={14} />} w={320} placeholder={t.search} value={q} onChange={(e) => setQ(e.currentTarget.value)} />
                  <Box w={220}>
                    <Text size="xs" c="dimmed" mb={4}>{t.minScore}: {minScore}</Text>
                    <Slider value={minScore} onChange={setMinScore} min={0} max={100} step={1} />
                  </Box>
                  <Select w={170} placeholder={t.status} data={statusOptions} value={status} onChange={setStatus} clearable />
                  <Select w={210} placeholder={t.region} data={regionOptions} value={region} onChange={setRegion} searchable clearable searchValue={regionSearch} onSearchChange={setRegionSearch} rightSection={regionLoading ? <Text size="xs" c="dimmed">...</Text> : null} />
                  <Select w={160} data={[{ value: '0', label: 'All' }, { value: '1', label: t.lockOnly }]} value={lockedOnly ? '1' : '0'} onChange={(v) => setLockedOnly(v === '1')} />
                  <Button variant="default" onClick={() => { setQ(''); setMinScore(0); setStatus(null); setRegion(null); setLockedOnly(false); setPage(1); }}>{t.reset}</Button>
                </Group>

                <Group mt="sm" mb={2} justify="space-between" wrap="wrap">
                  <Group gap={6}>
                    <Text size="xs" c="dimmed">{t.quickViews}</Text>
                    <Button size="compact-xs" variant="default" onClick={() => applyQuickView('high')}>High Potential</Button>
                    <Button size="compact-xs" variant="default" onClick={() => applyQuickView('locked')}>Locked</Button>
                    <Button size="compact-xs" variant="default" onClick={() => applyQuickView('followup')}>Follow-up</Button>
                    <Button size="compact-xs" variant="subtle" onClick={() => applyQuickView('all')}>All</Button>
                  </Group>
                  <Group gap={6}>
                    <Text size="xs" c="dimmed">{t.savedViews}</Text>
                    <Select w={180} placeholder={t.savedViews} data={savedViews.map(v => ({ value: v.name, label: v.name }))} value={selectedSavedView} onChange={applySavedView} clearable />
                    <TextInput w={140} placeholder={t.viewName} value={newViewName} onChange={(e) => setNewViewName(e.currentTarget.value)} />
                    <Button size="compact-xs" variant="default" onClick={saveCurrentView}>{t.saveView}</Button>
                    <Button size="compact-xs" variant="subtle" disabled={!selectedSavedView} onClick={deleteSavedView}>{t.deleteView}</Button>
                  </Group>
                </Group>

                <Group mt="sm" justify="space-between" wrap="wrap">
                  <Text size="sm" c="dimmed">{t.total}: {totalRows} · {t.page}: {page}/{totalPages}{loading ? ' · loading…' : ''}</Text>
                  <Group>
                    <Badge variant="light">{t.selected}: {selectedIds.size}</Badge>
                    <Select w={190} placeholder={t.bulkAction} data={bulkOptions} value={bulkAction} onChange={setBulkAction} clearable />
                    <Button size="xs" disabled={!bulkAction || selectedIds.size === 0} onClick={applyBulk}>{t.apply}</Button>
                  </Group>
                </Group>

                <Divider my="sm" />

                <ScrollArea type="always" offsetScrollbars>
                  <Table striped highlightOnHover withTableBorder withColumnBorders miw={2100} verticalSpacing={2} style={{ borderColor: colorScheme === 'dark' ? 'rgba(120,140,180,0.35)' : undefined }}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th w={46}><Checkbox checked={allChecked} onChange={(e) => {
                          const v = e.currentTarget.checked;
                          setSelectedIds(v ? new Set(sortedRows.map(r => r.id)) : new Set());
                        }} /></Table.Th>
                        <SortHead label="ID" k="id" w={64} /><SortHead label="Name" k="name" w={160} /><Table.Th w={160} style={thStyle}>Source</Table.Th><SortHead label="Score" k="score" w={88} /><SortHead label="Status" k="lead_status" /><SortHead label="Owner" k="owner" />
                        <Table.Th w={240} style={thStyle}>{(t as any).emails || 'Emails'}</Table.Th>
                        <Table.Th w={56} style={thStyle}>Locked</Table.Th><SortHead label="Vertical" k="vertical" /><Table.Th style={thStyle}>Region</Table.Th><SortHead label="CreatedAt" k="created_at" w={122} /><SortHead label="UpdatedAt" k="updated_at" w={122} /><Table.Th w={320} style={thStyle}>Action</Table.Th><Table.Th style={{ ...thStyle, width: 420, minWidth: 420, maxWidth: 420 }}>Reason</Table.Th><Table.Th style={thStyle}>{t.creator}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {rows.length === 0 ? (
                        <Table.Tr><Table.Td colSpan={16}><Text c="dimmed" ta="center" py="md">{loading ? t.loading : t.noData}</Text></Table.Td></Table.Tr>
                      ) : rows.map((r) => (
                        <Table.Tr key={r.id} style={recentEditedIds.has(r.id) ? { background: 'rgba(34,197,94,0.12)', transition: 'background 220ms ease' } : { transition: 'background 220ms ease' }}>
                          <Table.Td style={{ paddingTop: 10, paddingBottom: 10 }}>
                            <Checkbox checked={selectedIds.has(r.id)} onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.currentTarget.checked) next.add(r.id); else next.delete(r.id);
                              setSelectedIds(next);
                            }} />
                          </Table.Td>
                          <Table.Td style={{ paddingTop: 10, paddingBottom: 10 }}>{r.id}</Table.Td>
                          <Table.Td style={{ paddingTop: 10, paddingBottom: 10, maxWidth: 160 }}>
                            <Tooltip multiline w={480} withArrow label={r.name || '-'}>
                              <Text fw={600} size="sm" lineClamp={1} style={{ whiteSpace: 'nowrap' }}>{r.name}</Text>
                            </Tooltip>
                          </Table.Td>
                          <Table.Td style={{ paddingTop: 10, paddingBottom: 10, maxWidth: 160 }}>
                            <Tooltip multiline w={480} withArrow label={r.source || '-'}>
                              <Text size="xs" c="dimmed" lineClamp={1} style={{ whiteSpace: 'nowrap' }}>{r.source || '-'}</Text>
                            </Tooltip>
                          </Table.Td>
                          <Table.Td style={{ paddingTop: 10, paddingBottom: 10 }}>
                            {r.tidb_potential_score == null
                              ? '-'
                              : <Badge color={scoreColor(r.tidb_potential_score)} style={{ minWidth: 36, justifyContent: 'center' }}>{r.tidb_potential_score}</Badge>}
                          </Table.Td>
                          <Table.Td style={{ paddingTop: 10, paddingBottom: 10 }}>{r.lead_status}</Table.Td>
                          <Table.Td style={{ paddingTop: 10, paddingBottom: 10 }}>{r.owner || '-'}</Table.Td>
                          <Table.Td style={{ paddingTop: 10, paddingBottom: 10, maxWidth: 240 }}>
                            <Tooltip multiline w={480} withArrow label={(String(r.emails || '')).split(',').join(', ') || '-'}>
                              <Text size="xs" c="dimmed" lineClamp={2}>{(String(r.emails || '')).split(',').join(', ') || '-'}</Text>
                            </Tooltip>
                          </Table.Td>
                          <Table.Td style={{ paddingTop: 10, paddingBottom: 10 }}>{r.manual_locked ? <Tooltip label="LOCKED" withArrow><ActionIcon variant="light" color="violet" size="sm"><IconLock size={13} /></ActionIcon></Tooltip> : '-'}</Table.Td>
                          <Table.Td style={{ paddingTop: 10, paddingBottom: 10 }}>{r.vertical}</Table.Td>
                          <Table.Td style={{ paddingTop: 10, paddingBottom: 10 }}>{r.region || '-'}</Table.Td>
                          <Table.Td style={{ whiteSpace: 'nowrap', paddingTop: 10, paddingBottom: 10 }}>{(r.created_at || '').slice(0, 10)}</Table.Td>
                          <Table.Td style={{ whiteSpace: 'nowrap', paddingTop: 10, paddingBottom: 10 }}>{(r.updated_at || '').slice(0, 10)}</Table.Td>
                          <Table.Td style={{ paddingTop: 8, paddingBottom: 8 }}>
                            <Group gap={8} wrap="nowrap">
                              <Button variant="light" color="blue" size="xs" leftSection={<IconEdit size={14} />} onClick={() => setSelected({ ...r, emails: (r.emails || '').split(',').map(s => s.trim()).filter(Boolean).join('\n') })}>{t.edit}</Button>
                              <Button variant="light" color="grape" size="xs" leftSection={<IconNotes size={14} />} onClick={() => {
                                setLeadInterviewsCtx({ lead: { ...r } });
                              }}>{t.interviews}</Button>
                              <Button variant="light" color="red" size="xs" leftSection={<IconTrash size={14} />} onClick={() => requestDeleteOne(r.id)}>{t.delete}</Button>
                            </Group>
                          </Table.Td>
                          <Table.Td style={{ width: 420, minWidth: 420, maxWidth: 420, paddingTop: 10, paddingBottom: 10 }}>
                            <Tooltip multiline w={560} withArrow label={r.tidb_potential_reason || '-'}>
                              <Text size="sm" lineClamp={1}>{r.tidb_potential_reason || ''}</Text>
                            </Tooltip>
                          </Table.Td>
                          <Table.Td style={{ paddingTop: 10, paddingBottom: 10 }}><Text size="xs" c="dimmed" lineClamp={1}>{r.creator || '-'}</Text></Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                <Group mt="sm" justify="space-between" wrap="wrap">
                  <Group>
                    <Text size="sm" c="dimmed">{t.pageSize}</Text>
                    <Select w={92} data={[{value:'15',label:'15'},{value:'30',label:'30'},{value:'50',label:'50'},{value:'100',label:'100'}]} value={pageSize} onChange={(v) => { setPageSize(v || '15'); setPage(1); }} />
                  </Group>
                  <Group>
                    <Button variant="default" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t.prev}</Button>
                    <Button variant="default" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{t.next}</Button>
                  </Group>
                </Group>
              </Paper>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="outreach" pt="md">
            <Box px="xs">
              <Paper withBorder p="md" radius="md" style={{ borderColor: colorScheme === 'dark' ? 'rgba(120,140,180,0.35)' : undefined }}>
                <Group wrap="wrap" align="end">
                  <TextInput w={140} label={(t as any).leadId || 'LeadId'} placeholder="(optional)" value={outreachLeadId} onChange={(e) => setOutreachLeadId(e.currentTarget.value)} />
                  <TextInput w={260} label={(t as any).email || 'Email'} placeholder="(optional)" value={outreachEmail} onChange={(e) => setOutreachEmail(e.currentTarget.value)} />
                  <TextInput w={140} label={(t as any).from || 'From'} placeholder="YYYY-MM-DD" value={outreachFrom} onChange={(e) => setOutreachFrom(e.currentTarget.value)} />
                  <TextInput w={140} label={(t as any).to || 'To'} placeholder="YYYY-MM-DD" value={outreachTo} onChange={(e) => setOutreachTo(e.currentTarget.value)} />
                  <Button variant="default" leftSection={<IconFilter size={14} />} loading={outreachLoading} onClick={() => { setOutreachExpanded(new Set()); loadOutreachSends(); }}>{(t as any).apply || 'Apply'}</Button>
                  <Button variant="subtle" onClick={() => { setOutreachLeadId(''); setOutreachEmail(''); setOutreachFrom(''); setOutreachTo(''); setOutreachExpanded(new Set()); }}>{(t as any).reset || 'Reset'}</Button>
                </Group>

                <Divider my="sm" />

                <ScrollArea>
                  <Table striped highlightOnHover withTableBorder withColumnBorders miw={1400}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>LeadId</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>SentAt</Table.Th>
                        <Table.Th>Subject</Table.Th>
                        <Table.Th>Sender</Table.Th>
                        <Table.Th>Content</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {outreachRows.length === 0 ? (
                        <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="md">{outreachLoading ? ((t as any).loading || 'loading…') : t.noData}</Text></Table.Td></Table.Tr>
                      ) : outreachRows.map((r0) => {
                        const key = Number((r0 as any).id || 0) || Number(r0.lead_id * 1000000 + (new Date(r0.sent_at || '').getTime() % 1000000));
                        const expanded = outreachExpanded.has(key);
                        const content = String(r0.content || '');
                        const preview = content.length > 140 ? content.slice(0, 140) + '…' : content;
                        return (
                          <Table.Tr key={key}>
                            <Table.Td>{r0.lead_id}</Table.Td>
                            <Table.Td style={{ maxWidth: 260 }}><Tooltip withArrow label={r0.email}><Text lineClamp={1}>{r0.email}</Text></Tooltip></Table.Td>
                            <Table.Td style={{ whiteSpace: 'nowrap' }}>{(r0.sent_at || '').replace('T', ' ').slice(0, 19)}</Table.Td>
                            <Table.Td style={{ maxWidth: 320 }}><Tooltip multiline w={560} withArrow label={r0.subject || '-'}><Text fw={600} lineClamp={1}>{r0.subject || '-'}</Text></Tooltip></Table.Td>
                            <Table.Td style={{ maxWidth: 200 }}><Text size="xs" c="dimmed" lineClamp={1}>{r0.sender || '-'}</Text></Table.Td>
                            <Table.Td style={{ maxWidth: 520 }}>
                              <Group gap={6} wrap="nowrap" align="flex-start">
                                <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>{expanded ? (content || '-') : (preview || '-')}</Text>
                                {content.length > 140 ? (
                                  <ActionIcon variant="light" size="sm" onClick={() => {
                                    const next = new Set(outreachExpanded);
                                    if (next.has(key)) next.delete(key); else next.add(key);
                                    setOutreachExpanded(next);
                                  }}>{expanded ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />}</ActionIcon>
                                ) : null}
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Paper>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="interviews" pt="md">
            <Box px="xs">
              <Paper withBorder p="md" radius="md" style={{ borderColor: colorScheme === 'dark' ? 'rgba(120,140,180,0.35)' : undefined }}>
                <Group wrap="wrap" align="end">
                  <TextInput w={240} label={(t as any).leadId || 'LeadId'} placeholder="(optional)" value={interviewsTabLeadId} onChange={(e) => setInterviewsTabLeadId(e.currentTarget.value)} />
                  <TextInput w={260} label="Search" placeholder="q (title/summary/transcript)" value={interviewsTabQ} onChange={(e) => setInterviewsTabQ(e.currentTarget.value)} />
                  <TextInput w={150} label="Channel" placeholder="meeting/wechat/..." value={interviewsTabChannel} onChange={(e) => setInterviewsTabChannel(e.currentTarget.value)} />
                  <TextInput w={160} label="Interviewer" placeholder="(optional)" value={interviewsTabInterviewer} onChange={(e) => setInterviewsTabInterviewer(e.currentTarget.value)} />
                  <TextInput w={220} label="Tags (comma)" placeholder="pricing,security" value={interviewsTabTags} onChange={(e) => setInterviewsTabTags(e.currentTarget.value)} />
                  <Select w={150} label="Date preset" data={[{value:'last7',label:'last7'},{value:'last30',label:'last30'},{value:'last90',label:'last90'}]} value={interviewsTabDatePreset} onChange={(v) => setInterviewsTabDatePreset(v || 'last30')} />
                  <TextInput w={140} label={(t as any).from || 'From'} placeholder="YYYY-MM-DD" value={interviewsTabDateFrom} onChange={(e) => setInterviewsTabDateFrom(e.currentTarget.value)} />
                  <TextInput w={140} label={(t as any).to || 'To'} placeholder="YYYY-MM-DD" value={interviewsTabDateTo} onChange={(e) => setInterviewsTabDateTo(e.currentTarget.value)} />
                  <Button variant="default" leftSection={<IconFilter size={14} />} onClick={() => { setInterviewsRows([]); setInterviewsCursor(null); loadInterviews({ reset: true }); }}>{(t as any).apply || 'Apply'}</Button>
                  <Button variant="light" leftSection={<IconDownload size={14} />} onClick={() => {
                    const p = new URLSearchParams();
                    if (interviewsTabLeadId.trim()) p.set('leadId', interviewsTabLeadId.trim());
                    if (interviewsTabQ.trim()) p.set('q', interviewsTabQ.trim());
                    if (interviewsTabChannel.trim()) p.set('channel', interviewsTabChannel.trim());
                    if (interviewsTabInterviewer.trim()) p.set('interviewer', interviewsTabInterviewer.trim());
                    if (interviewsTabTags.trim()) interviewsTabTags.split(',').map(s => s.trim()).filter(Boolean).forEach(x => p.append('tags', x));
                    if (interviewsTabDatePreset) p.set('datePreset', interviewsTabDatePreset);
                    if (interviewsTabDateFrom.trim()) p.set('dateFrom', interviewsTabDateFrom.trim());
                    if (interviewsTabDateTo.trim()) p.set('dateTo', interviewsTabDateTo.trim());
                    window.open(`/interviews/export.md?${p.toString()}`, '_blank');
                  }}>Export md</Button>
                </Group>

                <Divider my="sm" />

                <ScrollArea>
                  <Table striped highlightOnHover withTableBorder withColumnBorders miw={1200}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>LeadId</Table.Th>
                        <Table.Th>Title</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Channel</Table.Th>
                        <Table.Th>Interviewer</Table.Th>
                        <Table.Th>Tags</Table.Th>
                        <Table.Th>Action</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {interviewsRows.length === 0 ? (
                        <Table.Tr><Table.Td colSpan={8}><Text c="dimmed" ta="center" py="md">{interviewsLoading ? 'loading…' : t.noData}</Text></Table.Td></Table.Tr>
                      ) : interviewsRows.map((it) => (
                        <Table.Tr key={it.id}>
                          <Table.Td>{it.id}</Table.Td>
                          <Table.Td>{it.lead_id}</Table.Td>
                          <Table.Td style={{ maxWidth: 360 }}><Tooltip withArrow label={it.title}><Text fw={600} lineClamp={1}>{it.title}</Text></Tooltip></Table.Td>
                          <Table.Td>{(it.interview_date || '').slice(0,10)}</Table.Td>
                          <Table.Td>{it.channel}</Table.Td>
                          <Table.Td>{it.interviewer || '-'}</Table.Td>
                          <Table.Td style={{ maxWidth: 220 }}><Text size="xs" c="dimmed" lineClamp={1}>{it.tags || '-'}</Text></Table.Td>
                          <Table.Td>
                            <Group gap={6}>
                              <ActionIcon variant="light" color="blue" onClick={() => { openInterviewEditor(it); }}><IconEdit size={14} /></ActionIcon>
                              <ActionIcon variant="light" onClick={() => window.open(`/interviews/${it.id}/export.md`, '_blank')}><IconDownload size={14} /></ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                <Group mt="sm" justify="space-between">
                  <Text size="xs" c="dimmed">cursor: {interviewsCursor || '-'}</Text>
                  <Button variant="default" disabled={!interviewsCursor || interviewsLoading} onClick={() => loadInterviews({ reset: false })}>Load more</Button>
                </Group>
              </Paper>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="enrich" pt="md">
            <Box px="xs">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <Card withBorder radius="md"><Text size="sm" c="dimmed">Pending</Text><Title order={3}>{enrich?.stats?.pending ?? 0}</Title></Card>
                <Card withBorder radius="md"><Text size="sm" c="dimmed">Running</Text><Title order={3}>{enrich?.stats?.running ?? 0}</Title></Card>
                <Card withBorder radius="md"><Text size="sm" c="dimmed">Done</Text><Title order={3}>{enrich?.stats?.done_count ?? 0}</Title></Card>
                <Card withBorder radius="md"><Text size="sm" c="dimmed">Failed</Text><Title order={3}>{enrich?.stats?.failed ?? 0}</Title></Card>
              </SimpleGrid>

              <Paper withBorder p="md" radius="md" mt="md">
                <Group>
                  <TextInput style={{ flex: 1 }} placeholder="IDs, e.g. 12,25,39" value={enqueueIds} onChange={(e) => setEnqueueIds(e.currentTarget.value)} />
                  <Button onClick={enqueue}>{t.enqueue}</Button>
                  <Button variant="light" leftSection={<IconActivity size={14} />} onClick={runEnrichBatch}>{t.runBatch}</Button>
                </Group>
              </Paper>

              <Paper withBorder p="md" radius="md" mt="md">
                <ScrollArea>
                  <Table striped highlightOnHover withTableBorder withColumnBorders miw={960}>
                    <Table.Thead>
                      <Table.Tr><Table.Th>QueueID</Table.Th><Table.Th>LeadID</Table.Th><Table.Th>Name</Table.Th><Table.Th>Status</Table.Th><Table.Th>Attempts</Table.Th><Table.Th>Updated</Table.Th></Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {(enrich?.rows || []).map((r) => (
                        <Table.Tr key={r.id} style={recentEditedIds.has(r.id) ? { background: 'rgba(34,197,94,0.12)', transition: 'background 220ms ease' } : { transition: 'background 220ms ease' }}><Table.Td style={{ paddingTop: 6, paddingBottom: 6 }}>{r.id}</Table.Td><Table.Td>{r.lead_id}</Table.Td><Table.Td>{r.name || ''}</Table.Td><Table.Td>{r.status}</Table.Td><Table.Td>{r.attempts}</Table.Td><Table.Td>{r.updated_at || ''}</Table.Td></Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Paper>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="dashboard" pt="md">
            <Box px="xs">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <Card withBorder shadow="sm" radius="md" style={{ transition: 'transform .18s ease, box-shadow .18s ease' }}><Text size="sm" c="dimmed">{t.total}</Text><Title order={3} fw={700}>{dash?.total ?? '-'}</Title></Card>
                <Card withBorder shadow="sm" radius="md" style={{ transition: 'transform .18s ease, box-shadow .18s ease' }}><Text size="sm" c="dimmed">{t.locked}</Text><Title order={3} fw={700}>{dash?.locked ?? '-'}</Title></Card>
                <Card withBorder shadow="sm" radius="md" style={{ transition: 'transform .18s ease, box-shadow .18s ease' }}><Text size="sm" c="dimmed">{t.avg}</Text><Title order={3} fw={700}>{dash?.avgScore ?? '-'}</Title></Card>
                <Card withBorder shadow="sm" radius="md" style={{ transition: 'transform .18s ease, box-shadow .18s ease' }}><Text size="sm" c="dimmed">{t.lockRate}</Text><Title order={3} fw={700}>{dash?.total ? Math.round((dash.locked / dash.total) * 100) : 0}%</Title></Card>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mt="md">
                <Card withBorder radius="md">
                  <Title order={4} mb="sm">{t.trend7d}</Title>
                  <TrendSparkline data={dash?.dailyTrend || []} />
                  <Text size="xs" c="dimmed" mt={6}>{(dash?.dailyTrend || []).map(x => `${x.d.slice(5)}:${x.c}`).join(' · ')}</Text>
                </Card>
                <Card withBorder radius="md">
                  <Title order={4} mb="sm">{t.scoreDist}</Title>
                  <HorizontalBars rows={(dash?.scoreBuckets || []).map(x => ({ k: x.bucket, v: x.c }))} />
                </Card>
                <Card withBorder radius="md">
                  <Title order={4} mb="sm">{t.enrichDist}</Title>
                  <HorizontalBars rows={(dash?.enrichRows || []).map(x => ({ k: x.enrich_status || 'unknown', v: x.c }))} />
                </Card>
              </SimpleGrid>
            </Box>
          </Tabs.Panel>
        </Tabs>
      </Stack>


      <Group justify="center" mt="md" mb="xs">
        <Text size="xs" c="dimmed">
          Powered by{' '}
          <Anchor href="https://tidbcloud.com" target="_blank" rel="noreferrer" underline="hover" c="blue.4">TiDB Cloud</Anchor>
          {' '} &amp; {' '}
          <Anchor href="https://openclaw.ai" target="_blank" rel="noreferrer" underline="hover" c="violet.4">OpenClaw</Anchor>
        </Text>
      </Group>

      <Modal opened={!!selected} onClose={() => setSelected(null)} title={selected?.name || t.edit} size="lg">
        {selected && (
          <Stack>
            <TextInput label="Name" value={selected.name || ''} onChange={(e) => setSelected({ ...selected, name: e.currentTarget.value })} />
            <TextInput label="Vertical" value={selected.vertical || ''} onChange={(e) => setSelected({ ...selected, vertical: e.currentTarget.value })} />
            <Select label="Status" data={statusOptions} value={selected.lead_status} onChange={(v) => setSelected({ ...selected, lead_status: v || 'new' })} />
            <TextInput label="Owner" value={selected.owner || ''} onChange={(e) => setSelected({ ...selected, owner: e.currentTarget.value })} />
            <Textarea label={(t as any).emails || 'Emails'} description="Comma/newline separated. Saved to lead.emails." minRows={3} maxRows={6} autosize value={(selected.emails as any) || ''} onChange={(e) => setSelected({ ...selected, emails: e.currentTarget.value })} />
            <NumberInput label="Score" min={0} max={100} value={selected.tidb_potential_score ?? 0} onChange={(v: any) => setSelected({ ...selected, tidb_potential_score: Number(v) })} />
            <Textarea label="Reason" minRows={14} maxRows={14} autosize value={selected.tidb_potential_reason || ''} onChange={(e) => setSelected({ ...selected, tidb_potential_reason: e.currentTarget.value })} />
            <Button onClick={saveLead}>{t.saveLock}</Button>
          </Stack>
        )}
      </Modal>

      <Modal opened={!!deleteCtx} onClose={() => setDeleteCtx(null)} title={t.deleteModalTitle} centered>
        <Stack>
          <Text>{t.deleteModalDesc}</Text>
          <Text size="sm" c="dimmed">{deleteCtx?.mode === 'bulk' ? `${deleteCtx.ids.length} items selected.` : t.deleteConfirm}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteCtx(null)}>{t.cancel}</Button>
            <Button color="red" onClick={confirmDelete}>{t.confirmDelete}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!leadInterviewsCtx}
        onClose={() => { leadInterviewsLoadSeq.current += 1; setLeadInterviewsCtx(null); setLeadInterviewsRows([]); setLeadInterviewsCursor(null); setLeadInterviewsLoading(false); }}
        title={leadInterviewsCtx ? `Lead Interviews · ${leadInterviewsCtx.lead.name} (#${leadInterviewsCtx.lead.id})` : 'Lead Interviews'}
        size="xl"
      >
        {leadInterviewsCtx ? (
          <Stack>
            <Group justify="space-between" wrap="wrap">
              <Group gap={8}>
                <Button leftSection={<IconNotes size={14} />} onClick={() => {
                  setEditInterviewCtx({ mode: 'create', leadId: leadInterviewsCtx.lead.id });
                  setEditInterviewDraft({
                    title: `${leadInterviewsCtx.lead.name} - ${new Date().toISOString().slice(0, 10)}`,
                    interviewDate: new Date().toISOString().slice(0, 10),
                    channel: 'meeting',
                    interviewer: '',
                    company: leadInterviewsCtx.lead.name,
                    contactName: '',
                    contactRole: '',
                    tags: '',
                    summary: '',
                    painPoints: '',
                    currentSolution: '',
                    requirements: '',
                    objectionsRisks: '',
                    nextSteps: '',
                    transcriptHtml: '<p></p>'
                  });
                }}>New Interview</Button>
                <Button variant="light" leftSection={<IconDownload size={14} />} onClick={() => window.open(`/interviews/export.md?leadId=${leadInterviewsCtx.lead.id}`, '_blank')}>Export lead md</Button>
              </Group>
              <Button variant="default" disabled={leadInterviewsLoading} onClick={() => { setLeadInterviewsRows([]); setLeadInterviewsCursor(null); loadLeadInterviews({ reset: true }); }}>Refresh</Button>
            </Group>

            <ScrollArea>
              <Table withTableBorder withColumnBorders striped highlightOnHover miw={1100}>
                <Table.Thead>
                  <Table.Tr><Table.Th>ID</Table.Th><Table.Th>Title</Table.Th><Table.Th>Date</Table.Th><Table.Th>Channel</Table.Th><Table.Th>Interviewer</Table.Th><Table.Th>Tags</Table.Th><Table.Th>Action</Table.Th></Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {leadInterviewsRows.length === 0 ? (
                    <Table.Tr><Table.Td colSpan={7}><Text c="dimmed" ta="center" py="md">{leadInterviewsLoading ? 'loading…' : t.noData}</Text></Table.Td></Table.Tr>
                  ) : leadInterviewsRows.map((it) => (
                    <Table.Tr key={it.id}>
                      <Table.Td>{it.id}</Table.Td>
                      <Table.Td style={{ maxWidth: 420 }}><Tooltip withArrow label={it.title}><Text fw={600} lineClamp={1}>{it.title}</Text></Tooltip></Table.Td>
                      <Table.Td>{(it.interview_date || '').slice(0,10)}</Table.Td>
                      <Table.Td>{it.channel}</Table.Td>
                      <Table.Td>{it.interviewer || '-'}</Table.Td>
                      <Table.Td><Text size="xs" c="dimmed" lineClamp={1}>{it.tags || '-'}</Text></Table.Td>
                      <Table.Td>
                        <Group gap={6}>
                          <ActionIcon variant="light" color="blue" onClick={() => { openInterviewEditor(it); }}><IconEdit size={14} /></ActionIcon>
                          <ActionIcon variant="light" onClick={() => window.open(`/interviews/${it.id}/export.md`, '_blank')}><IconDownload size={14} /></ActionIcon>
                          <ActionIcon variant="light" color="red" onClick={async () => {
                            const ok = window.confirm('Soft delete this interview?');
                            if (!ok) return;
                            await fetch(`/api/interviews/${it.id}`, { method: 'DELETE' });
                            setLeadInterviewsRows([]); setLeadInterviewsCursor(null);
                            await loadLeadInterviews({ reset: true });
                          }}><IconTrash size={14} /></ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            <Group justify="space-between" mt="sm">
              <Text size="xs" c="dimmed">cursor: {leadInterviewsCursor || '-'}</Text>
              <Button variant="default" disabled={!leadInterviewsCursor || leadInterviewsLoading} onClick={() => loadLeadInterviews({ reset: false })}>Load more</Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>

      <Modal
        opened={!!editInterviewCtx}
        onClose={() => { setEditInterviewCtx(null); setEditInterviewDraft(null); }}
        title={editInterviewCtx?.mode === 'create' ? `New Interview (Lead #${editInterviewCtx.leadId})` : `Edit Interview #${editInterviewCtx?.row?.id || ''}`}
        size="xl"
      >
        {editInterviewCtx && editInterviewDraft ? (
          <Stack>
            <Group grow>
              <TextInput label="Title" value={editInterviewDraft.title || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, title: e.currentTarget.value })} />
              <TextInput label="Interview Date" placeholder="YYYY-MM-DD" value={editInterviewDraft.interviewDate || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, interviewDate: e.currentTarget.value })} />
              <TextInput label="Channel" value={editInterviewDraft.channel || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, channel: e.currentTarget.value })} />
            </Group>
            <Group grow>
              <TextInput label="Interviewer" value={editInterviewDraft.interviewer || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, interviewer: e.currentTarget.value })} />
              <TextInput label="Company" value={editInterviewDraft.company || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, company: e.currentTarget.value })} />
              <TextInput label="Tags (comma)" value={editInterviewDraft.tags || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, tags: e.currentTarget.value })} />
            </Group>
            <Group grow>
              <TextInput label="Contact Name" value={editInterviewDraft.contactName || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, contactName: e.currentTarget.value })} />
              <TextInput label="Contact Role" value={editInterviewDraft.contactRole || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, contactRole: e.currentTarget.value })} />
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Textarea label="Summary" minRows={4} value={editInterviewDraft.summary || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, summary: e.currentTarget.value })} />
              <Textarea label="Pain Points" minRows={4} value={editInterviewDraft.painPoints || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, painPoints: e.currentTarget.value })} />
              <Textarea label="Current Solution" minRows={4} value={editInterviewDraft.currentSolution || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, currentSolution: e.currentTarget.value })} />
              <Textarea label="Requirements" minRows={4} value={editInterviewDraft.requirements || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, requirements: e.currentTarget.value })} />
              <Textarea label="Objections / Risks" minRows={4} value={editInterviewDraft.objectionsRisks || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, objectionsRisks: e.currentTarget.value })} />
              <Textarea label="Next Steps" minRows={4} value={editInterviewDraft.nextSteps || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, nextSteps: e.currentTarget.value })} />
            </SimpleGrid>

            <Textarea label="Transcript (HTML)" description="MVP stores HTML; plain text is derived on save." minRows={10} value={editInterviewDraft.transcriptHtml || ''} onChange={(e) => setEditInterviewDraft({ ...editInterviewDraft, transcriptHtml: e.currentTarget.value })} />

            <Group justify="flex-end">
              <Button variant="default" onClick={() => { setEditInterviewCtx(null); setEditInterviewDraft(null); }}>Cancel</Button>
              <Button onClick={async () => {
                const payload: any = {
                  leadId: editInterviewCtx.leadId,
                  title: editInterviewDraft.title,
                  interviewDate: editInterviewDraft.interviewDate,
                  channel: editInterviewDraft.channel,
                  interviewer: editInterviewDraft.interviewer,
                  company: editInterviewDraft.company,
                  contactName: editInterviewDraft.contactName,
                  contactRole: editInterviewDraft.contactRole,
                  tags: String(editInterviewDraft.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean),
                  summary: editInterviewDraft.summary,
                  painPoints: editInterviewDraft.painPoints,
                  currentSolution: editInterviewDraft.currentSolution,
                  requirements: editInterviewDraft.requirements,
                  objectionsRisks: editInterviewDraft.objectionsRisks,
                  nextSteps: editInterviewDraft.nextSteps,
                  transcriptHtml: editInterviewDraft.transcriptHtml,
                };

                if (editInterviewCtx.mode === 'create') {
                  await fetch('/api/interviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                } else {
                  await fetch(`/api/interviews/${editInterviewCtx.row!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                }

                setEditInterviewCtx(null);
                setEditInterviewDraft(null);

                // refresh lead interviews if opened
                if (leadInterviewsCtx) {
                  setLeadInterviewsRows([]); setLeadInterviewsCursor(null);
                  await loadLeadInterviews({ reset: true });
                }

                // refresh global interviews tab
                if (tab === 'interviews') {
                  setInterviewsRows([]); setInterviewsCursor(null);
                  await loadInterviews({ reset: true });
                }
              }}>Save</Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>

    </AppShell>
  );
}
