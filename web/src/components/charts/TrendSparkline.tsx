import { Text } from '@mantine/core';

export function TrendSparkline({ data }: { data: Array<{ d: string; c: number }> }) {
  if (!data?.length) return <Text size="sm" c="dimmed">-</Text>;
  const w = 340, h = 90, p = 10;
  const max = Math.max(...data.map(x => x.c), 1);
  const min = Math.min(...data.map(x => x.c), 0);
  const sx = (i: number) => p + (i * (w - 2 * p)) / Math.max(data.length - 1, 1);
  const sy = (v: number) => h - p - ((v - min) * (h - 2 * p)) / Math.max(max - min, 1);
  const d = data.map((x, i) => `${i === 0 ? 'M' : 'L'} ${sx(i)} ${sy(x.c)}`).join(' ');
  const areaD = d + ` L ${sx(data.length - 1)} ${h - p} L ${sx(0)} ${h - p} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.9" />
      {data.map((x, i) => <circle key={i} cx={sx(i)} cy={sy(x.c)} r="2.5" />)}
    </svg>
  );
}
