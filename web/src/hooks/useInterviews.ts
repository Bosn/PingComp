import { useEffect, useState } from 'react';
import type { Interview } from '../types';

export function useInterviews(tab: string | null) {
  const [interviewsTabQ, setInterviewsTabQ] = useState('');
  const [interviewsTabLeadId, setInterviewsTabLeadId] = useState<string>('');
  const [interviewsTabChannel, setInterviewsTabChannel] = useState<string>('');
  const [interviewsTabInterviewer, setInterviewsTabInterviewer] = useState<string>('');
  const [interviewsTabTags, setInterviewsTabTags] = useState<string>('');
  const [interviewsTabDatePreset, setInterviewsTabDatePreset] = useState<string>('last30');
  const [interviewsTabDateFrom, setInterviewsTabDateFrom] = useState<string>('');
  const [interviewsTabDateTo, setInterviewsTabDateTo] = useState<string>('');
  const [interviewsRows, setInterviewsRows] = useState<Interview[]>([]);
  const [interviewsCursor, setInterviewsCursor] = useState<string | null>(null);
  const [interviewsLoading, setInterviewsLoading] = useState(false);

  async function loadInterviews(opts?: { reset?: boolean }) {
    if (interviewsLoading) return;
    setInterviewsLoading(true);
    try {
      const params = new URLSearchParams();
      if (interviewsTabQ.trim()) params.set('q', interviewsTabQ.trim());
      if (interviewsTabLeadId.trim()) params.set('leadId', interviewsTabLeadId.trim());
      if (interviewsTabChannel.trim()) params.set('channel', interviewsTabChannel.trim());
      if (interviewsTabInterviewer.trim()) params.set('interviewer', interviewsTabInterviewer.trim());
      if (interviewsTabTags.trim()) {
        const parts = interviewsTabTags.split(',').map(s => s.trim()).filter(Boolean);
        for (const p of parts) params.append('tags', p);
      }
      if (interviewsTabDatePreset) params.set('datePreset', interviewsTabDatePreset);
      if (interviewsTabDateFrom.trim()) params.set('dateFrom', interviewsTabDateFrom.trim());
      if (interviewsTabDateTo.trim()) params.set('dateTo', interviewsTabDateTo.trim());
      params.set('limit', '50');
      if (!opts?.reset && interviewsCursor) params.set('cursor', interviewsCursor);

      const r = await fetch(`/api/interviews?${params.toString()}`);
      const j = await r.json();
      const next = (j.rows || []) as Interview[];
      setInterviewsRows(opts?.reset ? next : [...interviewsRows, ...next]);
      setInterviewsCursor(j.nextCursor || null);
    } finally {
      setInterviewsLoading(false);
    }
  }

  function getExportParams() {
    const p = new URLSearchParams();
    if (interviewsTabLeadId.trim()) p.set('leadId', interviewsTabLeadId.trim());
    if (interviewsTabQ.trim()) p.set('q', interviewsTabQ.trim());
    if (interviewsTabChannel.trim()) p.set('channel', interviewsTabChannel.trim());
    if (interviewsTabInterviewer.trim()) p.set('interviewer', interviewsTabInterviewer.trim());
    if (interviewsTabTags.trim()) interviewsTabTags.split(',').map(s => s.trim()).filter(Boolean).forEach(x => p.append('tags', x));
    if (interviewsTabDatePreset) p.set('datePreset', interviewsTabDatePreset);
    if (interviewsTabDateFrom.trim()) p.set('dateFrom', interviewsTabDateFrom.trim());
    if (interviewsTabDateTo.trim()) p.set('dateTo', interviewsTabDateTo.trim());
    return p;
  }

  useEffect(() => {
    if (tab === 'interviews') { setInterviewsCursor(null); loadInterviews({ reset: true }); }
  }, [tab]);

  return {
    interviewsTabQ, setInterviewsTabQ,
    interviewsTabLeadId, setInterviewsTabLeadId,
    interviewsTabChannel, setInterviewsTabChannel,
    interviewsTabInterviewer, setInterviewsTabInterviewer,
    interviewsTabTags, setInterviewsTabTags,
    interviewsTabDatePreset, setInterviewsTabDatePreset,
    interviewsTabDateFrom, setInterviewsTabDateFrom,
    interviewsTabDateTo, setInterviewsTabDateTo,
    interviewsRows, setInterviewsRows,
    interviewsCursor, setInterviewsCursor,
    interviewsLoading,
    loadInterviews, getExportParams,
  };
}
