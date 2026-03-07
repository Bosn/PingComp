import { Badge, Box, Button, Center, Code, Divider, Group, Loader, Modal, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconDownload } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

import type { Interview } from '../../types';

type Props = {
  opened: boolean;
  interviewId: number | null;
  currentIndex: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

function renderValue(value: unknown) {
  const text = value == null || value === '' ? '-' : String(value);
  return (
    <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {text}
    </Text>
  );
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={6}>
        {label}
      </Text>
      {renderValue(value)}
    </Paper>
  );
}

export function InterviewDetailModal({
  opened,
  interviewId,
  currentIndex,
  total,
  onClose,
  onPrev,
  onNext,
}: Props) {
  const [detail, setDetail] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadSeq = useRef(0);

  useEffect(() => {
    if (!opened || !interviewId) {
      setDetail(null);
      setError('');
      setLoading(false);
      return;
    }

    const seq = ++loadSeq.current;
    setLoading(true);
    setError('');

    fetch(`/api/interviews/${interviewId}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.row) {
          throw new Error(String(body?.error || 'Failed to load interview detail'));
        }
        if (seq !== loadSeq.current) return;
        setDetail(body.row as Interview);
      })
      .catch((err) => {
        if (seq !== loadSeq.current) return;
        setDetail(null);
        setError(String(err instanceof Error ? err.message : err || 'Failed to load interview detail'));
      })
      .finally(() => {
        if (seq === loadSeq.current) setLoading(false);
      });
  }, [opened, interviewId]);

  const tags = String(detail?.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={detail ? `Interview Detail #${detail.id}` : 'Interview Detail'}
      size="80%"
      centered
    >
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="xs">
            <Button variant="default" leftSection={<IconChevronLeft size={14} />} disabled={currentIndex <= 0 || loading} onClick={onPrev}>
              Previous
            </Button>
            <Button variant="default" rightSection={<IconChevronRight size={14} />} disabled={currentIndex >= total - 1 || loading} onClick={onNext}>
              Next
            </Button>
            <Text size="sm" c="dimmed">
              {total > 0 ? `${currentIndex + 1} / ${total}` : '0 / 0'}
            </Text>
          </Group>

          {detail ? (
            <Button variant="light" leftSection={<IconDownload size={14} />} onClick={() => window.open(`/interviews/${detail.id}/export.md`, '_blank')}>
              Export md
            </Button>
          ) : null}
        </Group>

        <Divider />

        {loading ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : error ? (
          <Paper withBorder radius="md" p="md">
            <Text c="red" size="sm">{error}</Text>
          </Paper>
        ) : detail ? (
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <DetailField label="ID" value={detail.id} />
              <DetailField label="Lead ID" value={detail.lead_id} />
              <DetailField label="Title" value={detail.title} />
              <DetailField label="Interview Date" value={detail.interview_date} />
              <DetailField label="Channel" value={detail.channel} />
              <DetailField label="Interviewer" value={detail.interviewer} />
              <DetailField label="Company" value={detail.company} />
              <DetailField label="Contact Name" value={detail.contact_name} />
              <DetailField label="Contact Role" value={detail.contact_role} />
              <Paper withBorder radius="md" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={6}>
                  Tags
                </Text>
                {tags.length ? (
                  <Group gap={6}>
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                ) : (
                  renderValue(detail.tags)
                )}
              </Paper>
              <DetailField label="Created At" value={detail.created_at} />
              <DetailField label="Created By" value={detail.created_by} />
              <DetailField label="Updated At" value={detail.updated_at} />
              <DetailField label="Updated By" value={detail.updated_by} />
              <DetailField label="Deleted At" value={detail.deleted_at} />
            </SimpleGrid>

            <DetailField label="Summary" value={detail.summary} />
            <DetailField label="Pain Points" value={detail.pain_points} />
            <DetailField label="Current Solution" value={detail.current_solution} />
            <DetailField label="Requirements" value={detail.requirements} />
            <DetailField label="Objections / Risks" value={detail.objections_risks} />
            <DetailField label="Next Steps" value={detail.next_steps} />
            <DetailField label="Transcript Plain" value={detail.transcript_plain} />
            <DetailField label="Transcript HTML" value={detail.transcript_html} />

            <Paper withBorder radius="md" p="sm">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={6}>
                Transcript HTML Preview
              </Text>
              {detail.transcript_html ? (
                <Box
                  style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: detail.transcript_html }}
                />
              ) : (
                <Code>-</Code>
              )}
            </Paper>
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">No interview selected.</Text>
        )}
      </Stack>
    </Modal>
  );
}
