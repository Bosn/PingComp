import { Badge } from '@mantine/core';
import { STATUS_BADGE } from '../../theme/colors';

export function StatusBadge({ s }: { s: string }) {
  const cfg = STATUS_BADGE[s] || { color: 'gray' };
  return <Badge color={cfg.color} variant="light" size="sm" style={{ textTransform: 'capitalize' }}>{s}</Badge>;
}
