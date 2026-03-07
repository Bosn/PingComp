import { Tabs, Box, SimpleGrid, Card, Group, Text, ThemeIcon, TextInput, Button, ScrollArea, Table, Alert } from '@mantine/core';
import { IconClock, IconActivity, IconCheck, IconX, IconInfoCircle } from '@tabler/icons-react';
import { EnrichStatusBadge, AnimatedNumber, GlassCard } from '../shared';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import type { EnrichPayload } from '../../types';
import type { I18NStrings } from '../../i18n';

const KPI_ACCENTS = [
  'linear-gradient(90deg, #F59E0B, #FBBF24)',
  'linear-gradient(90deg, #3B82F6, #60A5FA)',
  'linear-gradient(90deg, #22C55E, #4ADE80)',
  'linear-gradient(90deg, #EF4444, #F87171)',
];

type Props = {
  enrich: EnrichPayload | null;
  enqueueIds: string;
  setEnqueueIds: (v: string) => void;
  enqueue: () => void;
  runEnrichBatch: () => void;
  recentEditedIds: Set<number>;
  t: I18NStrings;
};

export function EnrichTab({ enrich, enqueueIds, setEnqueueIds, enqueue, runEnrichBatch, recentEditedIds, t }: Props) {
  const { isDark } = useThemeStyles();

  const stats = [
    { label: 'Pending', value: enrich?.stats?.pending ?? 0, color: 'yellow', icon: <IconClock size={20} />, idx: 0 },
    { label: 'Running', value: enrich?.stats?.running ?? 0, color: 'blue', icon: <IconActivity size={20} />, idx: 1 },
    { label: 'Done', value: enrich?.stats?.done_count ?? 0, color: 'green', icon: <IconCheck size={20} />, idx: 2 },
    { label: 'Failed', value: enrich?.stats?.failed ?? 0, color: 'red', icon: <IconX size={20} />, idx: 3 },
  ];

  return (
    <Tabs.Panel value="enrich" pt="md">
      <Box px="md" className="pc-slide-up">
        <Alert mb="md" radius="lg" variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
          {t.enrichConceptAlert}
        </Alert>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          {stats.map(s => (
            <Card
              key={s.label}
              withBorder
              radius="lg"
              p="lg"
              className="pc-kpi-card"
              style={{
                position: 'relative',
                overflow: 'hidden',
                background: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(16px) saturate(180%)',
                borderColor: isDark ? 'rgba(120,140,180,0.2)' : 'rgba(148,163,184,0.18)',
                ['--kpi-accent' as any]: KPI_ACCENTS[s.idx],
              }}
            >
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed" fw={600}>{s.label}</Text>
                <ThemeIcon
                  variant="light"
                  color={s.color}
                  size="xl"
                  radius="lg"
                  className={s.label === 'Running' && (enrich?.stats?.running ?? 0) > 0 ? 'pc-enrich-running' : undefined}
                >
                  {s.icon}
                </ThemeIcon>
              </Group>
              <AnimatedNumber order={2} fw={800} value={s.value} />
            </Card>
          ))}
        </SimpleGrid>

        {/* Pipeline visualization */}
        <GlassCard mt="md" p="lg">
          <Group gap="xs" mb="md" align="center" justify="center" wrap="wrap">
            {['Pending', 'Running', 'Done'].map((stage, i) => {
              const vals = [enrich?.stats?.pending ?? 0, enrich?.stats?.running ?? 0, enrich?.stats?.done_count ?? 0];
              const colors = ['#F59E0B', '#3B82F6', '#22C55E'];
              return (
                <Group key={stage} gap="xs" align="center">
                  {i > 0 && (
                    <Box style={{ width: 40, height: 2, background: isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.2)', borderRadius: 1 }} />
                  )}
                  <Box
                    style={{
                      padding: '6px 16px',
                      borderRadius: 20,
                      background: isDark ? `rgba(${i === 0 ? '245,158,11' : i === 1 ? '59,130,246' : '34,197,94'},0.15)` : `rgba(${i === 0 ? '245,158,11' : i === 1 ? '59,130,246' : '34,197,94'},0.1)`,
                      border: `1px solid ${colors[i]}40`,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {stage}: {vals[i]}
                  </Box>
                </Group>
              );
            })}
            <Group gap="xs" align="center">
              <Box style={{ width: 20, height: 2, background: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)', borderRadius: 1, transform: 'rotate(-30deg)' }} />
              <Box style={{ padding: '4px 12px', borderRadius: 20, background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, fontWeight: 600 }}>
                Failed: {enrich?.stats?.failed ?? 0}
              </Box>
            </Group>
          </Group>
          <Group>
            <TextInput style={{ flex: 1 }} placeholder="IDs, e.g. 12,25,39" value={enqueueIds} onChange={(e) => setEnqueueIds(e.currentTarget.value)} />
            <Button variant="gradient" gradient={{ from: 'blue', to: 'violet', deg: 135 }} onClick={enqueue}>{t.enqueue}</Button>
            <Button variant="light" leftSection={<IconActivity size={14} />} onClick={runEnrichBatch}>{t.runBatch}</Button>
          </Group>
        </GlassCard>

        <GlassCard mt="md">
          <ScrollArea>
            <Table striped highlightOnHover withTableBorder withColumnBorders miw={960}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>QueueID</Table.Th>
                  <Table.Th>LeadID</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Attempts</Table.Th>
                  <Table.Th>Updated</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(enrich?.rows || []).map((r) => (
                  <Table.Tr
                    key={r.id}
                    style={{
                      ...(recentEditedIds.has(r.id) ? { background: 'rgba(34,197,94,0.12)' } : {}),
                      ...(r.status === 'running' ? { background: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)' } : {}),
                      transition: 'background 220ms ease',
                    }}
                  >
                    <Table.Td style={{ paddingTop: 6, paddingBottom: 6 }}>{r.id}</Table.Td>
                    <Table.Td>{r.lead_id}</Table.Td>
                    <Table.Td>{r.name || ''}</Table.Td>
                    <Table.Td><EnrichStatusBadge s={r.status} /></Table.Td>
                    <Table.Td>{r.attempts}</Table.Td>
                    <Table.Td>{r.updated_at || ''}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </GlassCard>
      </Box>
    </Tabs.Panel>
  );
}
