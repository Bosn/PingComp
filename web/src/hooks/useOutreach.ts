import { useEffect, useRef, useState } from 'react';
import type { OutreachEmailSend } from '../types';

export function useOutreach(tab: string | null) {
  const [outreachLeadId, setOutreachLeadId] = useState<string>('');
  const [outreachEmail, setOutreachEmail] = useState<string>('');
  const [outreachFrom, setOutreachFrom] = useState<string>('');
  const [outreachTo, setOutreachTo] = useState<string>('');
  const [outreachRows, setOutreachRows] = useState<OutreachEmailSend[]>([]);
  const [outreachPage, setOutreachPage] = useState(1);
  const [outreachPageSize, setOutreachPageSize] = useState('15');
  const [outreachTotalPages, setOutreachTotalPages] = useState(1);
  const [outreachTotalRows, setOutreachTotalRows] = useState(0);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachExpanded, setOutreachExpanded] = useState<Set<number>>(new Set());
  const [outreachReloadKey, setOutreachReloadKey] = useState(0);
  const prevOutreachPageRef = useRef(1);

  async function fetchOutreachSends(pageOverride?: number) {
    if (outreachLoading) return;
    setOutreachLoading(true);
    try {
      const params = new URLSearchParams();
      if (outreachLeadId.trim()) params.set('leadId', outreachLeadId.trim());
      if (outreachEmail.trim()) params.set('email', outreachEmail.trim().toLowerCase());
      if (outreachFrom.trim()) params.set('from', outreachFrom.trim());
      if (outreachTo.trim()) params.set('to', outreachTo.trim());
      params.set('page', String(pageOverride ?? outreachPage));
      params.set('pageSize', outreachPageSize);

      const r = await fetch('/api/outreach/email-sends?' + params.toString());
      const j = await r.json();
      setOutreachRows((j.rows || []) as OutreachEmailSend[]);
      setOutreachPage(Math.max(1, Number(j.page || pageOverride || outreachPage)));
      setOutreachTotalPages(Math.max(1, Number(j.totalPages || 1)));
      setOutreachTotalRows(Number(j.total || 0));
    } finally {
      setOutreachLoading(false);
    }
  }

  function loadOutreachSends(pageOverride?: number) {
    const targetPage = pageOverride ?? outreachPage;
    if (targetPage !== outreachPage) {
      setOutreachPage(targetPage);
      return;
    }
    setOutreachReloadKey((v) => v + 1);
  }

  useEffect(() => {
    if (tab !== 'outreach') return;
    fetchOutreachSends();
  }, [tab, outreachPage]);

  useEffect(() => {
    if (tab !== 'outreach') return;
    if (prevOutreachPageRef.current !== 1) return;
    if (outreachPage !== 1) {
      setOutreachPage(1);
      return;
    }
    setOutreachReloadKey((v) => v + 1);
  }, [outreachPageSize]);

  useEffect(() => {
    if (tab !== 'outreach' || outreachReloadKey === 0) return;
    fetchOutreachSends();
  }, [outreachReloadKey]);

  useEffect(() => {
    prevOutreachPageRef.current = outreachPage;
  }, [outreachPage]);

  return {
    outreachLeadId, setOutreachLeadId,
    outreachEmail, setOutreachEmail,
    outreachFrom, setOutreachFrom,
    outreachTo, setOutreachTo,
    outreachPage, setOutreachPage,
    outreachPageSize, setOutreachPageSize,
    outreachTotalPages,
    outreachTotalRows,
    outreachRows, outreachLoading,
    outreachExpanded, setOutreachExpanded,
    loadOutreachSends,
  };
}
