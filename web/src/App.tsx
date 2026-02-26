import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon, AppShell, Avatar, Badge, Box, Button, Card, Checkbox, Divider, Group, Modal, NumberInput, Paper, ScrollArea, Select, Slider,
  SimpleGrid, Stack, Table, Tabs, Text, TextInput, Textarea, Title, Tooltip, useMantineColorScheme,
} from '@mantine/core';
import { IconActivity, IconArrowDown, IconArrowUp, IconBolt, IconBrain, IconEdit, IconFilter, IconGauge, IconLock, IconMessageCircle, IconMoonStars, IconSend, IconSun, IconTrash, IconWorld } from '@tabler/icons-react';

type Lead = {
  id: number; name: string; region?: string; vertical: string; source: string;
  tidb_potential_score: number | null; tidb_potential_reason: string; lead_status: string; owner: string;
  manual_locked: number; created_at?: string; updated_at?: string; funding?: string; linkedin?: string;
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
type EnrichPayload = { rows: EnrichJob[]; stats: { pending: number; running: number; done_count: number; failed: number } };

type ChatTurn = { role: 'user' | 'assistant'; text: string; rows?: Lead[] };

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
    title: 'PingComp', subtitle: '潜在客户人工清洗与标注', agent: 'Agent', dashboard: '仪表盘', leads: '线索管理', enrich: 'Enrich 队列',
    filter: '筛选', reset: '重置', search: '搜索 name/owner/vertical/source/tags', minScore: '最低分', status: '状态', region: '国家/地区', page: '页码',
    lockOnly: '仅锁定', prev: '上一页', next: '下一页', edit: '编辑', saveLock: '保存并锁定', total: '总线索',
    locked: '人工锁定', avg: '平均分', lockRate: '锁定占比', exportCsv: '导出CSV', runBatch: '执行一轮(20条)',
    enqueue: '入队', noData: '暂无数据', trend7d: '近7天更新趋势', scoreDist: '评分分布', enrichDist: 'Enrich状态',
    bulkAction: '批量动作', apply: '执行', selected: '已选', quickViews: '快捷视图', savedViews: '已保存视图', saveView: '保存当前视图', deleteView: '删除视图', viewName: '视图名', account: '账户', logout: '退出', delete: '删除', deleteConfirm: '确认删除该线索？', deleteModalTitle: '确认删除', deleteModalDesc: '删除后不可恢复，请确认操作。', cancel: '取消', confirmDelete: '确认删除', askAgent: '问问 Agent', askPlaceholder: '例如：找出 owner 为某人、分数大于80的客户',
  },
  en: {
    title: 'PingComp', subtitle: 'Lead ops workspace', agent: 'Agent', dashboard: 'Dashboard', leads: 'Leads', enrich: 'Enrich Queue',
    filter: 'Filter', reset: 'Reset', search: 'Search name/owner/vertical/source/tags', minScore: 'Min score', status: 'Status', region: 'Country/Region',
    page: 'Page', lockOnly: 'Locked only', prev: 'Prev', next: 'Next', edit: 'Edit', saveLock: 'Save & lock', total: 'Total leads',
    locked: 'Manual locked', avg: 'Avg score', lockRate: 'Lock ratio', exportCsv: 'Export CSV', runBatch: 'Run batch (20)',
    enqueue: 'Enqueue', noData: 'No data', trend7d: '7-day update trend', scoreDist: 'Score distribution', enrichDist: 'Enrich status',
    bulkAction: 'Bulk action', apply: 'Apply', selected: 'Selected', quickViews: 'Quick views', savedViews: 'Saved views', saveView: 'Save current view', deleteView: 'Delete view', viewName: 'View name', account: 'Account', logout: 'Logout', delete: 'Delete', deleteConfirm: 'Delete this lead?', deleteModalTitle: 'Confirm deletion', deleteModalDesc: 'This operation cannot be undone.', cancel: 'Cancel', confirmDelete: 'Delete', askAgent: 'Ask Agent', askPlaceholder: 'e.g. find leads with score >= 80 and a specific owner',
  },
} as const;

function useLocalLang() {
  const [lang, setLangState] = useState<'zh' | 'en'>(() => (localStorage.getItem('pingcomp_lang') === 'en' ? 'en' : 'zh'));
  const setLang = (v: 'zh' | 'en') => { localStorage.setItem('pingcomp_lang', v); setLangState(v); };
  return { lang, setLang };
}

const scoreColor = (v: number) => (v >= 75 ? 'green' : v >= 50 ? 'yellow' : 'red');

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
  const [lockedOnly, setLockedOnly] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [agentInput, setAgentInput] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentComposing, setAgentComposing] = useState(false);
  const [agentTurns, setAgentTurns] = useState<ChatTurn[]>([{ role: 'assistant', text: '我是 PingComp Agent。你可以自然语言问我潜在客户数据，例如："分数大于80且已锁定"。' }]);
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

  const statusOptions = useMemo(() => [
    { value: 'new', label: 'new' }, { value: 'contacted', label: 'contacted' },
    { value: 'qualified', label: 'qualified' }, { value: 'disqualified', label: 'disqualified' },
  ], []);

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) { if (r.region) set.add(String(r.region)); }
    return Array.from(set).sort().map(v => ({ value: v, label: v }));
  }, [rows]);

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
    params.set('pageSize', '50');
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

  useEffect(() => { if (tab === 'dashboard') loadDashboard(); if (tab === 'enrich') loadEnrich(); if (tab === 'leads') loadLeads(); }, [tab]);

  useEffect(() => {
    if (tab !== 'leads') return;
    const h = window.setTimeout(() => {
      setPage(1);
      loadLeads(1);
    }, 320);
    return () => window.clearTimeout(h);
  }, [q, minScore, status, region, lockedOnly, sortKey, sortDir, tab]);

  useEffect(() => {
    if (tab !== 'leads') return;
    loadLeads();
  }, [page]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(j => setMe(j?.user || null)).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (tab) localStorage.setItem('pingcomp_tab', tab);
  }, [tab]);


  async function askAgent() {
    const q = agentInput.trim();
    if (!q || agentLoading) return;
    setAgentTurns(prev => [...prev, { role: 'user', text: q }]);
    setAgentInput('');
    setAgentLoading(true);
    try {
      const r = await fetch('/api/agent/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: q })
      });
      const j = await r.json();
      setAgentTurns(prev => [...prev, { role: 'assistant', text: j.reply || 'Done', rows: j.rows || [] }]);
    } catch (e: any) {
      setAgentTurns(prev => [...prev, { role: 'assistant', text: `请求失败：${e?.message || e}` }]);
    } finally {
      setAgentLoading(false);
    }
  }

  async function saveLead() {
    if (!selected) return;
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
    background: colorScheme === 'dark' ? 'rgba(18,24,39,0.95)' : 'rgba(246,248,252,0.98)',
    borderBottom: colorScheme === 'dark' ? '1px solid rgba(120,140,180,0.45)' : '1px solid #d7deea',
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
            <Tabs.Tab value="enrich" leftSection={<IconBolt size={14} />}>{t.enrich}</Tabs.Tab>
            <Tabs.Tab value="dashboard" leftSection={<IconGauge size={14} />}>{t.dashboard}</Tabs.Tab>
          </Tabs.List>


          <Tabs.Panel value="agent" pt="md">
            <Box px="xs">
              <Paper withBorder p="md" radius="md" style={{ borderColor: colorScheme === 'dark' ? 'rgba(120,140,180,0.35)' : undefined }}>
                <Stack gap="sm">
                  <ScrollArea h={420}>
                    <Stack gap="sm">
                      {agentTurns.map((t0, i) => (
                        <Paper key={i} p="sm" radius="md" withBorder style={{ alignSelf: t0.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%', background: t0.role === 'user' ? (colorScheme === 'dark' ? 'rgba(59,130,246,.22)' : 'rgba(59,130,246,.12)') : undefined }}>
                          <Text size="sm">{t0.text}</Text>
                          {t0.rows && t0.rows.length > 0 ? (
                            <ScrollArea mt="xs">
                              <Table withTableBorder withColumnBorders verticalSpacing="xs" miw={760}>
                                <Table.Thead><Table.Tr><Table.Th>ID</Table.Th><Table.Th>Name</Table.Th><Table.Th>Owner</Table.Th><Table.Th>Score</Table.Th><Table.Th>Status</Table.Th><Table.Th>Locked</Table.Th></Table.Tr></Table.Thead>
                                <Table.Tbody>
                                  {t0.rows.slice(0, 20).map(r => (
                                    <Table.Tr key={r.id}><Table.Td>{r.id}</Table.Td><Table.Td>{r.name}</Table.Td><Table.Td>{r.owner || '-'}</Table.Td><Table.Td>{r.tidb_potential_score ?? '-'}</Table.Td><Table.Td>{r.lead_status}</Table.Td><Table.Td>{r.manual_locked ? 'Y' : '-'}</Table.Td></Table.Tr>
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
                  <Select w={190} placeholder={t.region} data={regionOptions} value={region} onChange={setRegion} searchable clearable />
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

                <ScrollArea>
                  <Table striped highlightOnHover withTableBorder withColumnBorders miw={1560} verticalSpacing="sm" style={{ borderColor: colorScheme === 'dark' ? 'rgba(120,140,180,0.35)' : undefined }}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th w={46}><Checkbox checked={allChecked} onChange={(e) => {
                          const v = e.currentTarget.checked;
                          setSelectedIds(v ? new Set(sortedRows.map(r => r.id)) : new Set());
                        }} /></Table.Th>
                        <SortHead label="ID" k="id" w={64} /><SortHead label="Name" k="name" /><SortHead label="Score" k="score" w={88} /><SortHead label="Status" k="lead_status" /><SortHead label="Owner" k="owner" />
                        <Table.Th w={56} style={thStyle}>Locked</Table.Th><SortHead label="Vertical" k="vertical" /><Table.Th style={thStyle}>Region</Table.Th><SortHead label="CreatedAt" k="created_at" w={122} /><SortHead label="UpdatedAt" k="updated_at" w={122} /><Table.Th w={96} style={thStyle}>Action</Table.Th><Table.Th style={{ ...thStyle, width: 420, minWidth: 420, maxWidth: 420 }}>Reason</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {rows.length === 0 ? (
                        <Table.Tr><Table.Td colSpan={13}><Text c="dimmed" ta="center" py="md">{t.noData}</Text></Table.Td></Table.Tr>
                      ) : rows.map((r) => (
                        <Table.Tr key={r.id} style={recentEditedIds.has(r.id) ? { background: 'rgba(34,197,94,0.12)', transition: 'background 220ms ease' } : { transition: 'background 220ms ease' }}>
                          <Table.Td>
                            <Checkbox checked={selectedIds.has(r.id)} onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.currentTarget.checked) next.add(r.id); else next.delete(r.id);
                              setSelectedIds(next);
                            }} />
                          </Table.Td>
                          <Table.Td>{r.id}</Table.Td>
                          <Table.Td><Text fw={600}>{r.name}</Text><Text size="xs" c="dimmed">{r.source}</Text></Table.Td>
                          <Table.Td><Badge color={scoreColor(r.tidb_potential_score ?? 0)} style={{ minWidth: 36, justifyContent: 'center' }}>{r.tidb_potential_score ?? '-'}</Badge></Table.Td>
                          <Table.Td>{r.lead_status}</Table.Td>
                          <Table.Td>{r.owner || '-'}</Table.Td>
                          <Table.Td>{r.manual_locked ? <Tooltip label="LOCKED" withArrow><ActionIcon variant="light" color="violet" size="sm"><IconLock size={13} /></ActionIcon></Tooltip> : '-'}</Table.Td>
                          <Table.Td>{r.vertical}</Table.Td>
                          <Table.Td>{r.region || '-'}</Table.Td>
                          <Table.Td style={{ whiteSpace: 'nowrap' }}>{(r.created_at || '').slice(0, 10)}</Table.Td>
                          <Table.Td style={{ whiteSpace: 'nowrap' }}>{(r.updated_at || '').slice(0, 10)}</Table.Td>
                          <Table.Td><Group gap={6}><ActionIcon variant="light" color="blue" onClick={() => setSelected({ ...r })} title={t.edit}><IconEdit size={14} /></ActionIcon><ActionIcon variant="light" color="red" onClick={() => requestDeleteOne(r.id)} title={t.delete}><IconTrash size={14} /></ActionIcon></Group></Table.Td>
                          <Table.Td style={{ width: 420, minWidth: 420, maxWidth: 420 }}>
                            <Tooltip multiline w={560} withArrow label={r.tidb_potential_reason || '-'}>
                              <Text size="sm" lineClamp={1}>{r.tidb_potential_reason || ''}</Text>
                            </Tooltip>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                <Group mt="sm" justify="space-between">
                  <Button variant="default" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t.prev}</Button>
                  <Button variant="default" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{t.next}</Button>
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
                        <Table.Tr key={r.id} style={recentEditedIds.has(r.id) ? { background: 'rgba(34,197,94,0.12)', transition: 'background 220ms ease' } : { transition: 'background 220ms ease' }}><Table.Td>{r.id}</Table.Td><Table.Td>{r.lead_id}</Table.Td><Table.Td>{r.name || ''}</Table.Td><Table.Td>{r.status}</Table.Td><Table.Td>{r.attempts}</Table.Td><Table.Td>{r.updated_at || ''}</Table.Td></Table.Tr>
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
          Powered by <a href="https://tidbcloud.com" target="_blank" rel="noreferrer">TiDB Cloud</a> &amp; <a href="https://openclaw.ai" target="_blank" rel="noreferrer">OpenClaw</a>
        </Text>
      </Group>

      <Modal opened={!!selected} onClose={() => setSelected(null)} title={selected?.name || t.edit} size="lg">
        {selected && (
          <Stack>
            <TextInput label="Name" value={selected.name || ''} onChange={(e) => setSelected({ ...selected, name: e.currentTarget.value })} />
            <TextInput label="Vertical" value={selected.vertical || ''} onChange={(e) => setSelected({ ...selected, vertical: e.currentTarget.value })} />
            <Select label="Status" data={statusOptions} value={selected.lead_status} onChange={(v) => setSelected({ ...selected, lead_status: v || 'new' })} />
            <TextInput label="Owner" value={selected.owner || ''} onChange={(e) => setSelected({ ...selected, owner: e.currentTarget.value })} />
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

    </AppShell>
  );
}
