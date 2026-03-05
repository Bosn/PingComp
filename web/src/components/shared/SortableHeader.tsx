import { Table, Group, Text } from '@mantine/core';
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import type { SortKey } from '../../types';

type SortableHeaderProps = {
  label: string;
  k: SortKey;
  w?: number;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
  thStyle: React.CSSProperties;
};

export function SortableHeader({ label, k, w, sortKey, sortDir, onSort, thStyle }: SortableHeaderProps) {
  return (
    <Table.Th w={w} style={thStyle}>
      <Group gap={4} wrap="nowrap" style={{ cursor: 'pointer' }} onClick={() => onSort(k)}>
        <Text size="sm" fw={600}>{label}</Text>
        {sortKey === k ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : null}
      </Group>
    </Table.Th>
  );
}
