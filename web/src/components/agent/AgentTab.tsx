import { Tabs, Box, Paper, Stack, Group, Text, Badge, Button, TextInput, Select, ScrollArea, Table } from '@mantine/core';
import { IconSend, IconRobot } from '@tabler/icons-react';
import { useComputedColorScheme } from '@mantine/core';
import { GlassCard } from '../shared';
import { PieMini, LineMini, BarMini } from '../charts';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import type { AgentSession, ChatTurn } from '../../types';
import type { I18NStrings } from '../../i18n';

type Props = {
  agentInput: string;
  setAgentInput: (v: string) => void;
  agentLoading: boolean;
  agentComposing: boolean;
  setAgentComposing: (v: boolean) => void;
  agentSessions: AgentSession[];
  currentSession: AgentSession | null;
  currentSessionId: string;
  setCurrentSessionId: (v: string) => void;
  agentTurns: ChatTurn[];
  askAgent: () => void;
  createSession: () => void;
  deleteCurrentSession: () => void;
  t: I18NStrings;
};

export function AgentTab({
  agentInput, setAgentInput,
  agentLoading, agentComposing, setAgentComposing,
  agentSessions, currentSession, currentSessionId, setCurrentSessionId,
  agentTurns, askAgent, createSession, deleteCurrentSession, t,
}: Props) {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: false });
  const { isDark, glassCard } = useThemeStyles();

  return (
    <Tabs.Panel value="agent" pt="md">
      <Box px="md" style={{ minHeight: 'calc(100vh - 210px)' }}>
        <Box style={{ display: 'flex', gap: 16, minHeight: 'calc(100vh - 230px)' }}>
          {/* Session sidebar */}
          <Paper
            withBorder
            radius="lg"
            p="sm"
            style={{
              width: 260,
              flexShrink: 0,
              background: isDark ? 'rgba(15,23,42,0.45)' : 'rgba(248,250,252,0.85)',
              backdropFilter: 'blur(16px)',
              borderColor: isDark ? 'rgba(120,140,180,0.2)' : 'rgba(148,163,184,0.18)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={700}>{t.sessions}</Text>
              <Button size="compact-xs" variant="light" onClick={createSession}>{t.newSession}</Button>
            </Group>
            <ScrollArea style={{ flex: 1 }}>
              <Stack gap={4}>
                {agentSessions.map(s0 => (
                  <Paper
                    key={s0.id}
                    p="xs"
                    radius="md"
                    style={{
                      cursor: 'pointer',
                      background: s0.id === (currentSession?.id || '')
                        ? (isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)')
                        : 'transparent',
                      border: s0.id === (currentSession?.id || '')
                        ? `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'}`
                        : '1px solid transparent',
                      transition: 'all 150ms ease',
                    }}
                    onClick={() => setCurrentSessionId(s0.id)}
                  >
                    <Text size="sm" fw={s0.id === (currentSession?.id || '') ? 600 : 400} lineClamp={1}>{s0.name}</Text>
                    <Text size="xs" c="dimmed">{s0.turns.length} messages</Text>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>
            <Button size="xs" color="red" variant="subtle" mt="sm" onClick={deleteCurrentSession}>{t.deleteSession}</Button>
          </Paper>

          {/* Chat area */}
          <Paper
            withBorder
            p="md"
            radius="lg"
            style={{
              ...glassCard,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ScrollArea style={{ flex: 1 }} offsetScrollbars scrollbarSize={8}>
              <Stack gap="md" pr="sm">
                {agentTurns.map((t0, i) => (
                  <Box
                    key={i}
                    style={{
                      alignSelf: t0.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '82%',
                    }}
                  >
                    {t0.role === 'assistant' && (
                      <Group gap={6} mb={4}>
                        <Badge size="xs" variant="gradient" gradient={{ from: 'violet', to: 'blue', deg: 135 }} leftSection={<IconRobot size={10} />}>
                          OpenClaw
                        </Badge>
                      </Group>
                    )}
                    <Paper
                      p="sm"
                      px="md"
                      radius="lg"
                      style={{
                        background: t0.role === 'user'
                          ? 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.2))'
                          : (isDark ? 'rgba(30,41,59,0.6)' : 'rgba(241,245,249,0.9)'),
                        border: t0.role === 'user'
                          ? `1px solid ${isDark ? 'rgba(96,165,250,0.3)' : 'rgba(59,130,246,0.2)'}`
                          : `1px solid ${isDark ? 'rgba(120,140,180,0.2)' : 'rgba(148,163,184,0.15)'}`,
                        borderLeft: t0.role === 'assistant'
                          ? '3px solid transparent'
                          : undefined,
                        borderImage: t0.role === 'assistant'
                          ? 'linear-gradient(180deg, #3B82F6, #8B5CF6) 1'
                          : undefined,
                      }}
                    >
                      <Text size="sm" style={{ lineHeight: 1.6 }}>{t0.text}</Text>
                      {t0.chart ? (
                        <GlassCard mt="xs" p="sm">
                          <Text size="xs" fw={700} mb={6}>{t0.chart.title || 'Chart'}</Text>
                          {t0.chart.type === 'pie' ? (
                            <PieMini labels={t0.chart.labels || []} values={t0.chart.values || []} />
                          ) : t0.chart.type === 'line' ? (
                            <LineMini labels={t0.chart.labels || []} values={t0.chart.values || []} />
                          ) : (
                            <BarMini labels={t0.chart.labels || []} values={t0.chart.values || []} />
                          )}
                        </GlassCard>
                      ) : null}
                      {t0.rows && t0.rows.length > 0 ? (
                        <ScrollArea mt="xs">
                          <Table withTableBorder withColumnBorders verticalSpacing="xs" miw={760}>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>ID</Table.Th>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Owner</Table.Th>
                                <Table.Th>Score</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Locked</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {t0.rows.slice(0, 20).map(r => (
                                <Table.Tr key={r.id}>
                                  <Table.Td style={{ paddingTop: 6, paddingBottom: 6 }}>{r.id}</Table.Td>
                                  <Table.Td>{r.name}</Table.Td>
                                  <Table.Td style={{ paddingTop: 6, paddingBottom: 6 }}>{r.owner || '-'}</Table.Td>
                                  <Table.Td>{r.tidb_potential_score ?? '-'}</Table.Td>
                                  <Table.Td style={{ paddingTop: 6, paddingBottom: 6 }}>{r.lead_status}</Table.Td>
                                  <Table.Td>{r.manual_locked ? 'Y' : '-'}</Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </ScrollArea>
                      ) : null}
                    </Paper>
                  </Box>
                ))}
                {/* Typing indicator */}
                {agentLoading && (
                  <Box style={{ alignSelf: 'flex-start' }}>
                    <Paper p="sm" px="md" radius="lg" style={{ background: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(241,245,249,0.9)', border: `1px solid ${isDark ? 'rgba(120,140,180,0.2)' : 'rgba(148,163,184,0.15)'}` }}>
                      <Group gap={4}>
                        <span className="pc-typing-dot" />
                        <span className="pc-typing-dot" />
                        <span className="pc-typing-dot" />
                      </Group>
                    </Paper>
                  </Box>
                )}
              </Stack>
            </ScrollArea>
            {/* Floating input bar */}
            <Paper
              mt="sm"
              p="xs"
              radius="xl"
              withBorder
              style={{
                background: isDark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.9)',
                borderColor: isDark ? 'rgba(120,140,180,0.25)' : 'rgba(148,163,184,0.2)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Group gap="xs">
                <TextInput
                  style={{ flex: 1 }}
                  variant="unstyled"
                  placeholder={t.askPlaceholder}
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.currentTarget.value)}
                  onCompositionStart={() => setAgentComposing(true)}
                  onCompositionEnd={() => setAgentComposing(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !agentComposing && !(e.nativeEvent as any)?.isComposing) askAgent();
                  }}
                  styles={{ input: { paddingLeft: 12 } }}
                />
                <Button
                  radius="xl"
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'violet', deg: 135 }}
                  leftSection={<IconSend size={14} />}
                  loading={agentLoading}
                  onClick={askAgent}
                >
                  {t.askAgent}
                </Button>
              </Group>
            </Paper>
          </Paper>
        </Box>
      </Box>
    </Tabs.Panel>
  );
}
