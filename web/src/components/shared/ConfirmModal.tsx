import { Modal, Stack, Text, Group, Button } from '@mantine/core';

type ConfirmModalProps = {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  detail?: string;
  cancelLabel: string;
  confirmLabel: string;
};

export function ConfirmModal({ opened, onClose, onConfirm, title, description, detail, cancelLabel, confirmLabel }: ConfirmModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Stack>
        <Text>{description}</Text>
        {detail && <Text size="sm" c="dimmed">{detail}</Text>}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>{cancelLabel}</Button>
          <Button color="red" onClick={onConfirm}>{confirmLabel}</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
