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
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [interviewsRows, setInterviewsRows] = useState<Interview[]>([]);
  const [interviewsPage, setInterviewsPage] = useState(1);
  const [interviewsPageSize, setInterviewsPageSize] = useState('15');
  const [interviewsTotalPages, setInterviewsTotalPages] = useState(1);
  const [interviewsTotalRows, setInterviewsTotalRows] = useState(0);
  const [interviewsLoading, setInterviewsLoading] = useState(false);

  async function loadInterviews(opts?: { pageOverride?: number }) {
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
      params.set('page', String(opts?.pageOverride || interviewsPage));
      params.set('pageSize', interviewsPageSize);

      const r = await fetch(`/api/interviews?${params.toString()}`);
      const j = await r.json();
      setInterviewsRows((j.rows || []) as Interview[]);
      setInterviewsTotalPages(Math.max(1, Number(j.totalPages || 1)));
      setInterviewsTotalRows(Number(j.total || 0));
    } finally {
      setInterviewsLoading(false);
    }
  }

  function resetInterviewsFilters() {
    setInterviewsTabQ('');
    setInterviewsTabLeadId('');
    setInterviewsTabChannel('');
    setInterviewsTabInterviewer('');
    setInterviewsTabTags('');
    setInterviewsTabDatePreset('last30');
    setInterviewsTabDateFrom('');
    setInterviewsTabDateTo('');
    setInterviewsPage(1);
    setShowMoreFilters(false);
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
    if (tab === 'interviews') loadInterviews({ pageOverride: 1 });
  }, [tab]);

  useEffect(() => {
    if (tab !== 'interviews') return;
    const h = window.setTimeout(() => {
      setInterviewsPage(1);
      loadInterviews({ pageOverride: 1 });
    }, 320);
    return () => window.clearTimeout(h);
  }, [
    interviewsTabQ,
    interviewsTabLeadId,
    interviewsTabChannel,
    interviewsTabInterviewer,
    interviewsTabTags,
    interviewsTabDatePreset,
    interviewsTabDateFrom,
    interviewsTabDateTo,
    interviewsPageSize,
    tab,
  ]);

  useEffect(() => {
    if (tab !== 'interviews') return;
    loadInterviews();
  }, [interviewsPage]);

  return {
    interviewsTabQ, setInterviewsTabQ,
    interviewsTabLeadId, setInterviewsTabLeadId,
    interviewsTabChannel, setInterviewsTabChannel,
    interviewsTabInterviewer, setInterviewsTabInterviewer,
    interviewsTabTags, setInterviewsTabTags,
    interviewsTabDatePreset, setInterviewsTabDatePreset,
    interviewsTabDateFrom, setInterviewsTabDateFrom,
    interviewsTabDateTo, setInterviewsTabDateTo,
    showMoreFilters, setShowMoreFilters,
    interviewsRows, setInterviewsRows,
    interviewsPage, setInterviewsPage,
    interviewsPageSize, setInterviewsPageSize,
    interviewsTotalPages, interviewsTotalRows,
    interviewsLoading,
    loadInterviews, resetInterviewsFilters, getExportParams,
  };
}
