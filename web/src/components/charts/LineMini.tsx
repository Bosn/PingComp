import { Box, Group, Text } from '@mantine/core';

export function LineMini({ labels, values }: { labels: string[]; values: number[] }) {
  const w = 520, h = 170, p = 20;
  const max = Math.max(...values, 1);
  const sx = (i: number) => p + (i * (w - 2 * p)) / Math.max(values.length - 1, 1);
  const sy = (v: number) => h - p - (v * (h - 2 * p)) / max;
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${sy(v)}`).join(' ');
  const areaD = d + ` L ${sx(values.length - 1)} ${h - p} L ${sx(0)} ${h - p} Z`;
  return (
    <Box>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#lineGrad)" />
        <path d={d} fill="none" stroke="#60a5fa" strokeWidth="2.5" />
        {values.map((v, i) => <circle key={i} cx={sx(i)} cy={sy(v)} r="2.8" fill="#93c5fd" />)}
      </svg>
      <Group gap={8} wrap="wrap">
        {labels.map((l, i) => <Text key={l + i} size="xs" c="dimmed">{l}:{values[i] ?? 0}</Text>)}
      </Group>
    </Box>
  );
}
