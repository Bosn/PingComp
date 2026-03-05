import { Tabs, Box, Group, TextInput, Button, Divider, ScrollArea, Table, Text, Tooltip, ActionIcon, ThemeIcon, Badge } from '@mantine/core';
import { IconFilter, IconArrowUp, IconArrowDown, IconMail, IconSend } from '@tabler/icons-react';
import { GlassCard } from '../shared';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import type { OutreachEmailSend } from '../../types';
import type { I18NStrings } from '../../i18n';

type Props = {
  outreachLeadId: string;
  setOutreachLeadId: (v: string) => void;
  outreachEmail: string;
  setOutreachEmail: (v: string) => void;
  outreachFrom: string;
  setOutreachFrom: (v: string) => void;
  outreachTo: string;
  setOutreachTo: (v: string) => void;
  outreachRows: OutreachEmailSend[];
  outreachLoading: boolean;
  outreachExpanded: Set<number>;
  setOutreachExpanded: (v: Set<number>) => void;
  loadOutreachSends: () => void;
  t: I18NStrings;
};

export function OutreachTab({
  outreachLeadId, setOutreachLeadId,
  outreachEmail, setOutreachEmail,
  outreachFrom, setOutreachFrom,
  outreachTo, setOutreachTo,
  outreachRows, outreachLoading,
  outreachExpanded, setOutreachExpanded,
  loadOutreachSends, t,
}: Props) {
  const { isDark } = useThemeStyles();

  return (
    <Tabs.Panel value="outreach" pt="md">
      <Box px="md" className="pc-slide-up">
        <GlassCard>
          <Group gap={8} mb="md">
            <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 135 }} size="md" radius="md">
              <IconMail size={14} />
            </ThemeIcon>
            <Text fw={700} size="md">Outreach Sends</Text>
            <Badge size="sm" variant="light" color="blue">{outreachRows.length}</Badge>
          </Group>

          <Group wrap="wrap" align="end" style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: isDark ? 'rgba(30,41,59,0.4)' : 'rgba(241,245,249,0.6)',
            border: `1px solid ${isDark ? 'rgba(120,140,180,0.15)' : 'rgba(148,163,184,0.12)'}`,
          }}>
            <TextInput w={140} label={t.leadId} placeholder="(optional)" value={outreachLeadId} onChange={(e) => setOutreachLeadId(e.currentTarget.value)} />
            <TextInput w={260} label={t.email} placeholder="(optional)" value={outreachEmail} onChange={(e) => setOutreachEmail(e.currentTarget.value)} />
            <TextInput w={140} label={t.from} placeholder="YYYY-MM-DD" value={outreachFrom} onChange={(e) => setOutreachFrom(e.currentTarget.value)} />
            <TextInput w={140} label={t.to} placeholder="YYYY-MM-DD" value={outreachTo} onChange={(e) => setOutreachTo(e.currentTarget.value)} />
            <Button variant="gradient" gradient={{ from: 'blue', to: 'violet', deg: 135 }} leftSection={<IconFilter size={14} />} loading={outreachLoading} onClick={() => { setOutreachExpanded(new Set()); loadOutreachSends(); }}>{t.apply}</Button>
            <Button variant="subtle" onClick={() => { setOutreachLeadId(''); setOutreachEmail(''); setOutreachFrom(''); setOutreachTo(''); setOutreachExpanded(new Set()); setTimeout(() => loadOutreachSends(), 0); }}>{t.reset}</Button>
          </Group>

          <Divider my="md" style={{ borderColor: isDark ? 'rgba(120,140,180,0.15)' : 'rgba(148,163,184,0.12)' }} />

          <ScrollArea>
            <Table striped highlightOnHover withTableBorder withColumnBorders miw={1400}>
              <Table.Thead>
                <Table.Tr style={{
                  background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.7)',
                }}>
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
                  <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="xl">{outreachLoading ? t.loading : t.noData}</Text></Table.Td></Table.Tr>
                ) : outreachRows.map((r0) => {
                  const key = Number((r0 as any).id || 0) || Number(r0.lead_id * 1000000 + (new Date(r0.sent_at || '').getTime() % 1000000));
                  const expanded = outreachExpanded.has(key);
                  const content = String(r0.content || '');
                  const preview = content.length > 140 ? content.slice(0, 140) + '...' : content;
                  return (
                    <Table.Tr key={key} style={{ transition: 'background 150ms ease' }}>
                      <Table.Td>
                        <Badge variant="light" color="blue" size="sm">{r0.lead_id}</Badge>
                      </Table.Td>
                      <Table.Td style={{ maxWidth: 320 }}>
                        {(() => {
                          const recipients = Array.isArray((r0 as any).batch_recipients) ? (r0 as any).batch_recipients as string[] : [r0.email];
                          const count = Number((r0 as any).batch_recipient_count || recipients.length || 1);
                          const label = recipients.join(', ');
                          const text = count > 1 ? `${r0.email} (+${count - 1} more)` : r0.email;
                          return <Tooltip withArrow multiline w={560} label={label || r0.email}><Text lineClamp={1}>{text}</Text></Tooltip>;
                        })()}
                      </Table.Td>
                      <Table.Td style={{ whiteSpace: 'nowrap' }}>
                        <Text size="sm" c="dimmed">{(r0.sent_at || '').replace('T', ' ').slice(0, 19)}</Text>
                      </Table.Td>
                      <Table.Td style={{ maxWidth: 320 }}>
                        <Tooltip multiline w={560} withArrow label={r0.subject || '-'}>
                          <Text fw={600} lineClamp={1}>{r0.subject || '-'}</Text>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td style={{ maxWidth: 200 }}>
                        <Group gap={4}>
                          <IconSend size={12} style={{ opacity: 0.4 }} />
                          <Text size="xs" c="dimmed" lineClamp={1}>{r0.sender || '-'}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ maxWidth: 520 }}>
                        <Group gap={6} wrap="nowrap" align="flex-start">
                          <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>{expanded ? (content || '-') : (preview || '-')}</Text>
                          {content.length > 140 ? (
                            <ActionIcon variant="light" size="sm" radius="xl" onClick={() => {
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
        </GlassCard>
      </Box>
    </Tabs.Panel>
  );
}
