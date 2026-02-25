import { useEffect, useMemo, useState } from 'react';
import {
  AppShell, Badge, Button, Card, Divider, Group, Modal, NumberInput, Paper, ScrollArea, Select,
  SimpleGrid, Stack, Table, Tabs, Text, TextInput, Textarea, Title, useMantineColorScheme,
} from '@mantine/core';
import { IconActivity, IconBolt, IconBrain, IconFilter, IconGauge, IconMoonStars, IconSun, IconWorld } from '@tabler/icons-react';

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
};

type EnrichJob = { id: number; lead_id: number; status: string; attempts: number; last_error?: string; updated_at?: string; name?: string; enrich_status?: string; };
type EnrichPayload = { rows: EnrichJob[]; stats: { pending: number; running: number; done_count: number; failed: number } };

const I18N = {
  zh: { title: 'PingComp', subtitle: '潜在客户人工清洗与标注', dashboard: '仪表盘', leads: '线索管理', enrich: 'Enrich 队列', filter: '筛选', reset: '重置', search: '搜索 name/vertical/source/tags', minScore: '最低分', status: '状态', page: '页码', lockOnly: '仅锁定', prev: '上一页', next: '下一页', edit: '编辑', saveLock: '保存并锁定', total: '总线索', locked: '人工锁定', avg: '平均分', lockRate: '锁定占比', exportCsv: '导出CSV', runBatch: '执行一轮(20条)', enqueue: '入队', noData: '暂无数据', trend7d: '近7天更新趋势' },
  en: { title: 'PingComp', subtitle: 'Lead ops workspace', dashboard: 'Dashboard', leads: 'Leads', enrich: 'Enrich Queue', filter: 'Filter', reset: 'Reset', search: 'Search name/vertical/source/tags', minScore: 'Min score', status: 'Status', page: 'Page', lockOnly: 'Locked only', prev: 'Prev', next: 'Next', edit: 'Edit', saveLock: 'Save & lock', total: 'Total leads', locked: 'Manual locked', avg: 'Avg score', lockRate: 'Lock ratio', exportCsv: 'Export CSV', runBatch: 'Run batch (20)', enqueue: 'Enqueue', noData: 'No data', trend7d: '7-day update trend' },
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
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.9" />
      {data.map((x, i) => <circle key={i} cx={sx(i)} cy={sy(x.c)} r="2.5" />)}
    </svg>
  );
}

export function App() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { lang, setLang } = useLocalLang();
  const t = I18N[lang];

  const [tab, setTab] = useState<string | null>('dashboard');
  const [rows, setRows] = useState<Lead[]>([]);
  const [q, setQ] = useState('');
  const [minScore, setMinScore] = useState<number | ''>('');
  const [status, setStatus] = useState<string | null>(null);
  const [lockedOnly, setLockedOnly] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [dash, setDash] = useState<DashboardPayload | null>(null);
  const [enrich, setEnrich] = useState<EnrichPayload | null>(null);
  const [enqueueIds, setEnqueueIds] = useState('');

  const statusOptions = useMemo(() => [
    { value: 'new', label: 'new' }, { value: 'contacted', label: 'contacted' },
    { value: 'qualified', label: 'qualified' }, { value: 'disqualified', label: 'disqualified' },
  ], []);

  async function loadLeads() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (minScore !== '') params.set('minScore', String(minScore));
    if (status) params.set('status', status);
    if (lockedOnly) params.set('locked', '1');
    params.set('page', String(page));
    params.set('pageSize', '50');
    const r = await fetch(`/api/leads?${params.toString()}`);
    const j = await r.json();
    setRows(j.rows || []); setTotalPages(j.totalPages || 1); setTotalRows(j.total || 0); setLoading(false);
  }

  async function loadDashboard() { const r = await fetch('/api/dashboard'); setDash(await r.json()); }
  async function loadEnrich() { const r = await fetch('/api/enrich/queue'); setEnrich(await r.json()); }

  useEffect(() => { loadLeads(); }, [page]);
  useEffect(() => { if (tab === 'dashboard') loadDashboard(); if (tab === 'enrich') loadEnrich(); if (tab === 'leads') loadLeads(); }, [tab]);

  async function saveLead() {
    if (!selected) return;
    await fetch(`/api/leads/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selected) });
    setSelected(null);
    await Promise.all([loadLeads(), loadDashboard()]);
  }
  async function runEnrichBatch() { await fetch('/api/enrich/run', { method: 'POST' }); await loadEnrich(); }
  async function enqueue() { await fetch('/api/enrich/enqueue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: enqueueIds }) }); setEnqueueIds(''); await loadEnrich(); }

  return (
    <AppShell padding="md">
      <Stack gap="md">
        <Paper withBorder p="md" radius="md" style={{ backdropFilter: 'blur(8px)' }}>
          <Group justify="space-between" align="center">
            <Group>
              <img src="/logo.svg" alt="PingComp" width={36} height={36} />
              <Stack gap={0}>
                <Title order={2} fw={700}>{t.title}</Title>
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
              <Button component="a" href="/api/export.csv" variant="light">{t.exportCsv}</Button>
            </Group>
          </Group>
        </Paper>

        <Tabs value={tab} onChange={setTab}>
          <Tabs.List>
            <Tabs.Tab value="dashboard" leftSection={<IconGauge size={14} />}>{t.dashboard}</Tabs.Tab>
            <Tabs.Tab value="leads" leftSection={<IconBrain size={14} />}>{t.leads}</Tabs.Tab>
            <Tabs.Tab value="enrich" leftSection={<IconBolt size={14} />}>{t.enrich}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dashboard" pt="md">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <Card withBorder shadow="sm" radius="md"><Text size="sm" c="dimmed">{t.total}</Text><Title order={3} fw={700}>{dash?.total ?? '-'}</Title></Card>
              <Card withBorder shadow="sm" radius="md"><Text size="sm" c="dimmed">{t.locked}</Text><Title order={3} fw={700}>{dash?.locked ?? '-'}</Title></Card>
              <Card withBorder shadow="sm" radius="md"><Text size="sm" c="dimmed">{t.avg}</Text><Title order={3} fw={700}>{dash?.avgScore ?? '-'}</Title></Card>
              <Card withBorder shadow="sm" radius="md"><Text size="sm" c="dimmed">{t.lockRate}</Text><Title order={3} fw={700}>{dash?.total ? Math.round((dash.locked / dash.total) * 100) : 0}%</Title></Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" mt="md">
              <Card withBorder radius="md">
                <Title order={4} mb="sm">Status distribution</Title>
                {(dash?.statusRows || []).map((s) => (
                  <Group key={s.lead_status} justify="space-between" py={6}><Text>{s.lead_status}</Text><Badge>{s.c}</Badge></Group>
                ))}
              </Card>
              <Card withBorder radius="md">
                <Title order={4} mb="sm">{t.trend7d}</Title>
                <TrendSparkline data={dash?.dailyTrend || []} />
                <Text size="xs" c="dimmed" mt={6}>{(dash?.dailyTrend || []).map(x => `${x.d.slice(5)}:${x.c}`).join(' · ')}</Text>
              </Card>
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="leads" pt="md">
            <Paper withBorder p="md" radius="md">
              <Group wrap="wrap" align="end">
                <TextInput leftSection={<IconFilter size={14} />} w={320} placeholder={t.search} value={q} onChange={(e) => setQ(e.currentTarget.value)} />
                <NumberInput w={140} placeholder={t.minScore} value={minScore} onChange={(v: any) => setMinScore(v ?? '')} min={0} max={100} allowNegative={false} />
                <Select w={170} placeholder={t.status} data={statusOptions} value={status} onChange={setStatus} clearable />
                <Select w={160} data={[{ value: '0', label: 'All' }, { value: '1', label: t.lockOnly }]} value={lockedOnly ? '1' : '0'} onChange={(v) => setLockedOnly(v === '1')} />
                <Button loading={loading} onClick={() => { setPage(1); loadLeads(); }}>{t.filter}</Button>
                <Button variant="default" onClick={() => { setQ(''); setMinScore(''); setStatus(null); setLockedOnly(false); setPage(1); setTimeout(loadLeads, 0); }}>{t.reset}</Button>
              </Group>

              <Group mt="xs" mb="sm" c="dimmed" justify="space-between">
                <Text size="sm">{t.total}: {totalRows} · {t.page}: {page}/{totalPages}</Text>
              </Group>

              <Divider mb="sm" />

              <ScrollArea>
                <Table striped highlightOnHover withTableBorder withColumnBorders miw={1500} verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>ID</Table.Th><Table.Th>Name</Table.Th><Table.Th>Score</Table.Th><Table.Th>Status</Table.Th><Table.Th>Owner</Table.Th>
                      <Table.Th>Locked</Table.Th><Table.Th>Vertical</Table.Th><Table.Th>CreatedAt</Table.Th><Table.Th>UpdatedAt</Table.Th><Table.Th>Action</Table.Th><Table.Th style={{ minWidth: 360 }}>Reason</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.length === 0 ? (
                      <Table.Tr><Table.Td colSpan={11}><Text c="dimmed" ta="center" py="md">{t.noData}</Text></Table.Td></Table.Tr>
                    ) : rows.map((r) => (
                      <Table.Tr key={r.id}>
                        <Table.Td>{r.id}</Table.Td>
                        <Table.Td><Text fw={600}>{r.name}</Text><Text size="xs" c="dimmed">{r.source}</Text></Table.Td>
                        <Table.Td><Badge color={scoreColor(r.tidb_potential_score ?? 0)}>{r.tidb_potential_score ?? '-'}</Badge></Table.Td>
                        <Table.Td>{r.lead_status}</Table.Td>
                        <Table.Td>{r.owner || '-'}</Table.Td>
                        <Table.Td>{r.manual_locked ? 'LOCKED' : '-'}</Table.Td>
                        <Table.Td>{r.vertical}</Table.Td>
                        <Table.Td>{(r.created_at || '').slice(0, 10)}</Table.Td>
                        <Table.Td>{(r.updated_at || '').slice(0, 10)}</Table.Td>
                        <Table.Td><Button size="xs" onClick={() => setSelected({ ...r })}>{t.edit}</Button></Table.Td>
                        <Table.Td><Text size="sm" lineClamp={2}>{r.tidb_potential_reason || ''}</Text></Table.Td>
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
          </Tabs.Panel>

          <Tabs.Panel value="enrich" pt="md">
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
                      <Table.Tr key={r.id}><Table.Td>{r.id}</Table.Td><Table.Td>{r.lead_id}</Table.Td><Table.Td>{r.name || ''}</Table.Td><Table.Td>{r.status}</Table.Td><Table.Td>{r.attempts}</Table.Td><Table.Td>{r.updated_at || ''}</Table.Td></Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Modal opened={!!selected} onClose={() => setSelected(null)} title={selected?.name || t.edit} size="lg">
        {selected && (
          <Stack>
            <TextInput label="Name" value={selected.name || ''} onChange={(e) => setSelected({ ...selected, name: e.currentTarget.value })} />
            <TextInput label="Vertical" value={selected.vertical || ''} onChange={(e) => setSelected({ ...selected, vertical: e.currentTarget.value })} />
            <Select label="Status" data={statusOptions} value={selected.lead_status} onChange={(v) => setSelected({ ...selected, lead_status: v || 'new' })} />
            <TextInput label="Owner" value={selected.owner || ''} onChange={(e) => setSelected({ ...selected, owner: e.currentTarget.value })} />
            <NumberInput label="Score" min={0} max={100} value={selected.tidb_potential_score ?? 0} onChange={(v: any) => setSelected({ ...selected, tidb_potential_score: Number(v) })} />
            <Textarea label="Reason" value={selected.tidb_potential_reason || ''} onChange={(e) => setSelected({ ...selected, tidb_potential_reason: e.currentTarget.value })} />
            <Button onClick={saveLead}>{t.saveLock}</Button>
          </Stack>
        )}
      </Modal>
    </AppShell>
  );
}
