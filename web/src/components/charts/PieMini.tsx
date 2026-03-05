import { Box, Group, Stack, Text } from '@mantine/core';

const COLORS = ['#4f8cff', '#7c5cff', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#a855f7', '#64748b', '#eab308', '#10b981'];

export function PieMini({ labels, values }: { labels: string[]; values: number[] }) {
  const total = Math.max(values.reduce((a, b) => a + b, 0), 1);
  let acc = 0;
  const stops = values.map((v, i) => {
    const start = (acc / total) * 100;
    acc += v;
    const end = (acc / total) * 100;
    return `${COLORS[i % COLORS.length]} ${start}% ${end}%`;
  }).join(', ');
  return (
    <Group align="flex-start" gap="md" wrap="wrap">
      <Box w={150} h={150} style={{ borderRadius: '50%', background: `conic-gradient(${stops || '#334155 0 100%'})`, border: '1px solid rgba(148,163,184,.35)' }} />
      <Stack gap={4}>
        {labels.map((l, i) => (
          <Group key={l + i} gap={6}><Box w={10} h={10} style={{ borderRadius: 2, background: COLORS[i % COLORS.length] }} /><Text size="xs">{l}: {values[i] ?? 0}</Text></Group>
        ))}
      </Stack>
    </Group>
  );
}
