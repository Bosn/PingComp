import { Group, Text, Select, Button, Box } from '@mantine/core';

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

function getPageItems(page: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const items: Array<number | 'dots'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) items.push('dots');
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < totalPages - 1) items.push('dots');
  items.push(totalPages);

  return items;
}

export function PagePagination({ page, totalPages, pageSize, onPageChange, onPageSizeChange, pageSizeLabel, prevLabel, nextLabel }: PagePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const pageItems = getPageItems(safePage, safeTotalPages);

  return (
    <Group mt="sm" justify="space-between" wrap="wrap">
      <Group>
        <Text size="sm" c="dimmed">{pageSizeLabel}</Text>
        <Select
          w={92}
          data={[{ value: '15', label: '15' }, { value: '30', label: '30' }, { value: '50', label: '50' }, { value: '100', label: '100' }]}
          value={pageSize}
          onChange={(v) => {
            onPageSizeChange(v || '15');
            if (safePage !== 1) onPageChange(1);
          }}
        />
      </Group>
      <Group gap="xs" wrap="wrap" justify="flex-end">
        <Button variant="default" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>{prevLabel}</Button>
        <Group gap={6} wrap="wrap">
          {pageItems.map((item, index) => (
            item === 'dots' ? (
              <Box
                key={`dots-${index}`}
                px={6}
                style={{ minWidth: 28, textAlign: 'center', color: 'var(--mantine-color-dimmed)' }}
              >
                ...
              </Box>
            ) : (
              <Button
                key={item}
                variant={item === safePage ? 'filled' : 'default'}
                color={item === safePage ? 'blue' : undefined}
                onClick={() => onPageChange(item)}
                style={{ minWidth: 36 }}
              >
                {item}
              </Button>
            )
          ))}
        </Group>
        <Button variant="default" disabled={safePage >= safeTotalPages} onClick={() => onPageChange(safePage + 1)}>{nextLabel}</Button>
      </Group>
    </Group>
  );
}
