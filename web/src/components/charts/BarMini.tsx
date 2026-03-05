import { Box, Group, Stack, Text } from '@mantine/core';

export function BarMini({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <Stack gap={6}>
      {labels.map((l, i) => (
        <Box key={l + i}>
          <Group justify="space-between" mb={2}><Text size="xs">{l}</Text><Text size="xs" fw={600}>{values[i] ?? 0}</Text></Group>
          <Box h={8} bg="dark.4" style={{ borderRadius: 999, overflow: 'hidden' }}>
            <Box h="100%" w={`${Math.max(4, ((values[i] ?? 0) / max) * 100)}%`} bg="#60a5fa" style={{ borderRadius: 999 }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
