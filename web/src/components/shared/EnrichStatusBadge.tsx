import { Badge } from '@mantine/core';
import { ENRICH_STATUS_COLOR } from '../../theme/colors';

export function EnrichStatusBadge({ s }: { s: string }) {
  return <Badge color={ENRICH_STATUS_COLOR[s] || 'gray'} variant="light" size="sm">{s}</Badge>;
}
