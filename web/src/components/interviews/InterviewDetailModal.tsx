import { Badge, Box, Button, Center, Divider, Group, Loader, Modal, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconDownload } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';

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

function isPresent(value: unknown) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function renderValue(value: unknown) {
  const text = String(value ?? '');
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
  const optionalFields = detail ? [
    ['Interviewer', detail.interviewer],
    ['Company', detail.company],
    ['Contact Name', detail.contact_name],
    ['Contact Role', detail.contact_role],
    ['Created At', detail.created_at],
    ['Created By', detail.created_by],
    ['Updated At', detail.updated_at],
    ['Updated By', detail.updated_by],
  ].filter(([, value]) => isPresent(value)) : [];
  const optionalSections = detail ? [
    ['Summary', detail.summary],
    ['Pain Points', detail.pain_points],
    ['Current Solution', detail.current_solution],
    ['Requirements', detail.requirements],
    ['Objections / Risks', detail.objections_risks],
    ['Next Steps', detail.next_steps],
  ].filter(([, value]) => isPresent(value)) : [];

  const safeTranscriptHtml = useMemo(() => {
    if (!isPresent(detail?.transcript_html)) return '';
    return DOMPurify.sanitize(String(detail?.transcript_html || ''), {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
      ALLOW_DATA_ATTR: false,
    });
  }, [detail?.transcript_html]);

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
              {optionalFields.map(([label, value]) => (
                <DetailField key={label} label={label} value={value} />
              ))}
              {tags.length ? (
                <Paper withBorder radius="md" p="sm">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={6}>
                    Tags
                  </Text>
                  <Group gap={6}>
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                </Paper>
              ) : null}
            </SimpleGrid>

            {optionalSections.map(([label, value]) => (
              <DetailField key={label} label={label} value={value} />
            ))}

            {isPresent(detail.transcript_html) ? (
              <Paper withBorder radius="md" p="sm">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={6}>
                  Transcript
                </Text>
                <Box
                  style={{
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: 1.7,
                    fontSize: 14,
                  }}
                  dangerouslySetInnerHTML={{ __html: safeTranscriptHtml }}
                />
              </Paper>
            ) : null}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">No interview selected.</Text>
        )}
      </Stack>
    </Modal>
  );
}
