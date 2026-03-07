import { Tabs, Box, Group, TextInput, Button, Select, Divider, ScrollArea, Table, Text, Tooltip, ActionIcon, ThemeIcon, Badge } from '@mantine/core';
import { IconFilter, IconDownload, IconEdit, IconNotes, IconCalendar, IconEye } from '@tabler/icons-react';
import { GlassCard } from '../shared';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import type { Interview } from '../../types';
import type { I18NStrings } from '../../i18n';

const CHANNEL_COLORS: Record<string, string> = {
  meeting: 'blue',
  wechat: 'green',
  phone: 'orange',
  email: 'violet',
  zoom: 'cyan',
  slack: 'grape',
};

type Props = {
  interviewsTabQ: string;
  setInterviewsTabQ: (v: string) => void;
  interviewsTabLeadId: string;
  setInterviewsTabLeadId: (v: string) => void;
  interviewsTabChannel: string;
  setInterviewsTabChannel: (v: string) => void;
  interviewsTabInterviewer: string;
  setInterviewsTabInterviewer: (v: string) => void;
  interviewsTabTags: string;
  setInterviewsTabTags: (v: string) => void;
  interviewsTabDatePreset: string;
  setInterviewsTabDatePreset: (v: string) => void;
  interviewsTabDateFrom: string;
  setInterviewsTabDateFrom: (v: string) => void;
  interviewsTabDateTo: string;
  setInterviewsTabDateTo: (v: string) => void;
  interviewsRows: Interview[];
  setInterviewsRows: (v: Interview[]) => void;
  interviewsCursor: string | null;
  setInterviewsCursor: (v: string | null) => void;
  interviewsLoading: boolean;
  loadInterviews: (opts?: { reset?: boolean }) => void;
  getExportParams: () => URLSearchParams;
  openInterviewEditor: (it: Interview) => void;
  openInterviewDetail: (index: number) => void;
  t: I18NStrings;
};

export function InterviewsTab({
  interviewsTabQ, setInterviewsTabQ,
  interviewsTabLeadId, setInterviewsTabLeadId,
  interviewsTabChannel, setInterviewsTabChannel,
  interviewsTabInterviewer, setInterviewsTabInterviewer,
  interviewsTabTags, setInterviewsTabTags,
  interviewsTabDatePreset, setInterviewsTabDatePreset,
  interviewsTabDateFrom, setInterviewsTabDateFrom,
  interviewsTabDateTo, setInterviewsTabDateTo,
  interviewsRows, setInterviewsRows,
  interviewsCursor, setInterviewsCursor,
  interviewsLoading, loadInterviews, getExportParams,
  openInterviewEditor, openInterviewDetail, t,
}: Props) {
  const { isDark } = useThemeStyles();

  return (
    <Tabs.Panel value="interviews" pt="md">
      <Box px="md" className="pc-slide-up">
        <GlassCard>
          <Group gap={8} mb="md">
            <ThemeIcon variant="gradient" gradient={{ from: 'teal', to: 'green', deg: 135 }} size="md" radius="md">
              <IconNotes size={14} />
            </ThemeIcon>
            <Text fw={700} size="md">Interviews</Text>
            <Badge size="sm" variant="light" color="teal">{interviewsRows.length}</Badge>
          </Group>

          <Box style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: isDark ? 'rgba(30,41,59,0.4)' : 'rgba(241,245,249,0.6)',
            border: `1px solid ${isDark ? 'rgba(120,140,180,0.15)' : 'rgba(148,163,184,0.12)'}`,
          }}>
            <Group wrap="wrap" align="end">
              <TextInput w={240} label={t.leadId} placeholder="(optional)" value={interviewsTabLeadId} onChange={(e) => setInterviewsTabLeadId(e.currentTarget.value)} />
              <TextInput w={260} label="Search" placeholder="q (title/summary/transcript)" value={interviewsTabQ} onChange={(e) => setInterviewsTabQ(e.currentTarget.value)} />
              <TextInput w={150} label="Channel" placeholder="meeting/wechat/..." value={interviewsTabChannel} onChange={(e) => setInterviewsTabChannel(e.currentTarget.value)} />
              <TextInput w={160} label="Interviewer" placeholder="(optional)" value={interviewsTabInterviewer} onChange={(e) => setInterviewsTabInterviewer(e.currentTarget.value)} />
              <TextInput w={220} label="Tags (comma)" placeholder="pricing,security" value={interviewsTabTags} onChange={(e) => setInterviewsTabTags(e.currentTarget.value)} />
              <Select w={150} label="Date preset" data={[{ value: 'last7', label: 'last7' }, { value: 'last30', label: 'last30' }, { value: 'last90', label: 'last90' }]} value={interviewsTabDatePreset} onChange={(v) => setInterviewsTabDatePreset(v || 'last30')} />
              <TextInput w={140} label={t.from} placeholder="YYYY-MM-DD" value={interviewsTabDateFrom} onChange={(e) => setInterviewsTabDateFrom(e.currentTarget.value)} />
              <TextInput w={140} label={t.to} placeholder="YYYY-MM-DD" value={interviewsTabDateTo} onChange={(e) => setInterviewsTabDateTo(e.currentTarget.value)} />
              <Button variant="gradient" gradient={{ from: 'teal', to: 'green', deg: 135 }} leftSection={<IconFilter size={14} />} onClick={() => { setInterviewsRows([]); setInterviewsCursor(null); loadInterviews({ reset: true }); }}>{t.apply}</Button>
              <Button variant="light" leftSection={<IconDownload size={14} />} onClick={() => {
                window.open(`/interviews/export.md?${getExportParams().toString()}`, '_blank');
              }}>Export md</Button>
            </Group>
          </Box>

          <Divider my="md" style={{ borderColor: isDark ? 'rgba(120,140,180,0.15)' : 'rgba(148,163,184,0.12)' }} />

          <ScrollArea>
            <Table striped highlightOnHover withTableBorder withColumnBorders miw={1200}>
              <Table.Thead>
                <Table.Tr style={{
                  background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.7)',
                }}>
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
                  <Table.Tr><Table.Td colSpan={8}><Text c="dimmed" ta="center" py="xl">{interviewsLoading ? 'loading...' : t.noData}</Text></Table.Td></Table.Tr>
                ) : interviewsRows.map((it, index) => {
                  const channelColor = CHANNEL_COLORS[it.channel?.toLowerCase() || ''] || 'gray';
                  return (
                    <Table.Tr
                      key={it.id}
                      style={{
                        borderLeft: `3px solid var(--mantine-color-${channelColor}-4)`,
                        transition: 'background 150ms ease',
                      }}
                    >
                      <Table.Td>
                        <Text size="sm" c="dimmed">{it.id}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="blue" size="sm">{it.lead_id}</Badge>
                      </Table.Td>
                      <Table.Td style={{ maxWidth: 360 }}>
                        <Tooltip withArrow label={it.title}>
                          <Text
                            fw={600}
                            lineClamp={1}
                            component="button"
                            type="button"
                            onClick={() => openInterviewDetail(index)}
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              background: 'transparent',
                              border: 0,
                              padding: 0,
                              cursor: 'pointer',
                              color: 'var(--mantine-color-blue-6)',
                            }}
                          >
                            {it.title}
                          </Text>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <IconCalendar size={13} style={{ opacity: 0.4 }} />
                          <Text size="sm">{(it.interview_date || '').slice(0, 10)}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={channelColor} size="sm">{it.channel}</Badge>
                      </Table.Td>
                      <Table.Td>{it.interviewer || '-'}</Table.Td>
                      <Table.Td style={{ maxWidth: 220 }}>
                        <Group gap={4}>
                          {(it.tags || '').split(',').filter(Boolean).map((tag, i) => (
                            <Badge key={i} variant="outline" size="xs" color="gray">{tag.trim()}</Badge>
                          ))}
                          {!(it.tags || '').trim() && <Text size="xs" c="dimmed">-</Text>}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6}>
                          <Tooltip label="Edit" withArrow>
                            <ActionIcon variant="light" color="blue" radius="md" onClick={() => openInterviewEditor(it)}><IconEdit size={14} /></ActionIcon>
                          </Tooltip>
                          <Tooltip label="View detail" withArrow>
                            <ActionIcon variant="light" color="grape" radius="md" onClick={() => openInterviewDetail(index)}><IconEye size={14} /></ActionIcon>
                          </Tooltip>
                          <Tooltip label="Export" withArrow>
                            <ActionIcon variant="light" radius="md" onClick={() => window.open(`/interviews/${it.id}/export.md`, '_blank')}><IconDownload size={14} /></ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          <Group mt="md" justify="flex-end">
            <Button
              variant={interviewsCursor ? 'gradient' : 'default'}
              gradient={{ from: 'teal', to: 'green', deg: 135 }}
              disabled={!interviewsCursor || interviewsLoading}
              onClick={() => loadInterviews({ reset: false })}
            >
              {interviewsCursor ? 'Load more' : 'All loaded'}
            </Button>
          </Group>
        </GlassCard>
      </Box>
    </Tabs.Panel>
  );
}
