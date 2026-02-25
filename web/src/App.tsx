import { useEffect, useState } from 'react';
import { AppShell, Badge, Button, Group, NumberInput, Select, Stack, Table, Text, TextInput, Title, Modal, Textarea } from '@mantine/core';

type Lead = {
  id: number;
  name: string;
  vertical: string;
  source: string;
  tidb_potential_score: number | null;
  tidb_potential_reason: string;
  lead_status: string;
  owner: string;
  manual_locked: number;
  created_at?: string;
  updated_at?: string;
};

export function App() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [q, setQ] = useState('');
  const [minScore, setMinScore] = useState<number | ''>('');
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (minScore !== '') params.set('minScore', String(minScore));
    if (status) params.set('status', status);
    params.set('page', String(page));
    params.set('pageSize', '50');
    const r = await fetch(`/api/leads?${params.toString()}`);
    const j = await r.json();
    setRows(j.rows || []);
    setTotalPages(j.totalPages || 1);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page]);

  async function saveLead() {
    if (!selected) return;
    await fetch(`/api/leads/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected)
    });
    setSelected(null);
    await load();
  }

  return (
    <AppShell padding="md">
      <Stack>
        <Group justify="space-between">
          <Title order={2}>PingComp React</Title>
          <Group>
            <Button variant="light" component="a" href="/dashboard">Old Dashboard</Button>
            <Button variant="light" component="a" href="/enrich">Enrich Queue</Button>
          </Group>
        </Group>

        <Group>
          <TextInput placeholder="Search name/vertical/source" value={q} onChange={(e) => setQ(e.currentTarget.value)} />
          <NumberInput placeholder="Min score" value={minScore} onChange={(v:any)=>setMinScore(v ?? '')} allowNegative={false} min={0} max={100} />
          <Select placeholder="Status" data={["new","contacted","qualified","disqualified"]} value={status} onChange={setStatus} clearable />
          <Button onClick={() => { setPage(1); load(); }} loading={loading}>Filter</Button>
        </Group>

        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Score</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Locked</Table.Th>
              <Table.Th>Vertical</Table.Th>
              <Table.Th>CreatedAt</Table.Th>
              <Table.Th>UpdatedAt</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>{r.id}</Table.Td>
                <Table.Td>
                  <Text fw={600}>{r.name}</Text>
                  <Text size="xs" c="dimmed">{r.source}</Text>
                </Table.Td>
                <Table.Td><Badge color={(r.tidb_potential_score ?? 0) >= 75 ? 'green' : (r.tidb_potential_score ?? 0) >= 50 ? 'yellow' : 'red'}>{r.tidb_potential_score ?? '-'}</Badge></Table.Td>
                <Table.Td>{r.lead_status}</Table.Td>
                <Table.Td>{r.manual_locked ? 'LOCKED' : '-'}</Table.Td>
                <Table.Td>{r.vertical}</Table.Td>
                <Table.Td>{r.created_at || ''}</Table.Td>
                <Table.Td>{r.updated_at || ''}</Table.Td>
                <Table.Td><Button size="xs" onClick={() => setSelected({ ...r })}>Edit</Button></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Group>
          <Button variant="default" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Text>Page {page}/{totalPages}</Text>
          <Button variant="default" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </Group>
      </Stack>

      <Modal opened={!!selected} onClose={() => setSelected(null)} title={selected?.name || 'Edit'} size="lg">
        {selected && (
          <Stack>
            <TextInput label="Name" value={selected.name || ''} onChange={(e)=>setSelected({...selected,name:e.currentTarget.value})} />
            <TextInput label="Vertical" value={selected.vertical || ''} onChange={(e)=>setSelected({...selected,vertical:e.currentTarget.value})} />
            <Select label="Status" data={["new","contacted","qualified","disqualified"]} value={selected.lead_status} onChange={(v)=>setSelected({...selected,lead_status:v||'new'})} />
            <NumberInput label="Score" min={0} max={100} value={selected.tidb_potential_score ?? 0} onChange={(v:any)=>setSelected({...selected,tidb_potential_score: Number(v)})} />
            <Textarea label="Reason" value={selected.tidb_potential_reason || ''} onChange={(e)=>setSelected({...selected,tidb_potential_reason:e.currentTarget.value})} />
            <Button onClick={saveLead}>Save (lock)</Button>
          </Stack>
        )}
      </Modal>
    </AppShell>
  );
}
