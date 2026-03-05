import { Box, Group, Stack, Text } from '@mantine/core';

export function HorizontalBars({ rows }: { rows: Array<{ k: string; v: number }> }) {
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
