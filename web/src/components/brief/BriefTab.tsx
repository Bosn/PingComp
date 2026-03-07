import { useEffect, useState } from 'react';
import { Tabs, Box, Stack, Paper, Text, Button, Group, ScrollArea } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

import type { I18NStrings } from '../../i18n';
import { useThemeStyles } from '../../hooks/useThemeStyles';

type BriefItem = {
  name: string;
  createdAt: string;
  content: string;
};

export function BriefTab({ t }: { t: I18NStrings }) {
  const { isDark, glassCard } = useThemeStyles();
  const [rows, setRows] = useState<BriefItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/briefs?limit=10');
      const j = await r.json();
      setRows(Array.isArray(j?.rows) ? j.rows : []);
    } finally {
      setLoading(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      await fetch('/api/briefs/run');
      await load();
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Tabs.Panel value="brief" pt="md">
      <Box px="md" style={{ minHeight: 'calc(100vh - 210px)' }}>
        <Group justify="space-between" mb="sm">
          <Text fw={700} size="lg">{t.brief}</Text>
          <Group>
            <Button variant="default" onClick={load} loading={loading}>{t.refresh || '刷新'}</Button>
            <Button onClick={runNow} loading={running}>Run Brief Now</Button>
          </Group>
        </Group>

        <Stack gap="md">
          {rows.map((b) => (
            <Paper key={b.name} p="md" radius="md" withBorder style={glassCard}>
              <Text size="xs" c="dimmed" mb={6}>{b.name} · {new Date(b.createdAt).toLocaleString()}</Text>
              <ScrollArea.Autosize mah={460}>
                <Box style={{ fontSize: 14, lineHeight: 1.7, color: isDark ? '#e5e7eb' : '#0f172a' }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                      a: ({ href, children }) => (
                        <a href={href || '#'} target="_blank" rel="noopener noreferrer">{children}</a>
                      ),
                    }}
                  >
                    {b.content}
                  </ReactMarkdown>
                </Box>
              </ScrollArea.Autosize>
            </Paper>
          ))}
          {!rows.length && !loading ? (
            <Paper p="md" radius="md" withBorder style={glassCard}><Text c="dimmed">No brief yet.</Text></Paper>
          ) : null}
        </Stack>
      </Box>
    </Tabs.Panel>
  );
}
