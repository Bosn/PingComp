import { Text, Stack } from '@mantine/core';

type EmptyStateProps = {
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
};

export function EmptyState({ loading, loadingText = 'Loading...', emptyText = 'No data' }: EmptyStateProps) {
  return (
    <Stack align="center" py="xl">
      <Text c="dimmed" ta="center">{loading ? loadingText : emptyText}</Text>
    </Stack>
  );
}
