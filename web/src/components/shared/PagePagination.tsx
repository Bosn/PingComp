import { Group, Text, Select, Button } from '@mantine/core';

type PagePaginationProps = {
  page: number;
  totalPages: number;
  pageSize: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: string) => void;
  pageSizeLabel: string;
  prevLabel: string;
  nextLabel: string;
};

export function PagePagination({ page, totalPages, pageSize, onPageChange, onPageSizeChange, pageSizeLabel, prevLabel, nextLabel }: PagePaginationProps) {
  return (
    <Group mt="sm" justify="space-between" wrap="wrap">
      <Group>
        <Text size="sm" c="dimmed">{pageSizeLabel}</Text>
        <Select
          w={92}
          data={[{ value: '15', label: '15' }, { value: '30', label: '30' }, { value: '50', label: '50' }, { value: '100', label: '100' }]}
          value={pageSize}
          onChange={(v) => onPageSizeChange(v || '15')}
        />
      </Group>
      <Group>
        <Button variant="default" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>{prevLabel}</Button>
        <Button variant="default" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>{nextLabel}</Button>
      </Group>
    </Group>
  );
}
