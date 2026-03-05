import { useEffect, useState } from 'react';
import type { OutreachEmailSend } from '../types';

export function useOutreach(tab: string | null) {
  const [outreachLeadId, setOutreachLeadId] = useState<string>('');
  const [outreachEmail, setOutreachEmail] = useState<string>('');
  const [outreachFrom, setOutreachFrom] = useState<string>('');
  const [outreachTo, setOutreachTo] = useState<string>('');
  const [outreachRows, setOutreachRows] = useState<OutreachEmailSend[]>([]);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachExpanded, setOutreachExpanded] = useState<Set<number>>(new Set());

  async function loadOutreachSends() {
    if (outreachLoading) return;
    setOutreachLoading(true);
    try {
      const params = new URLSearchParams();
      if (outreachLeadId.trim()) params.set('leadId', outreachLeadId.trim());
      if (outreachEmail.trim()) params.set('email', outreachEmail.trim().toLowerCase());
      if (outreachFrom.trim()) params.set('from', outreachFrom.trim());
      if (outreachTo.trim()) params.set('to', outreachTo.trim());
      params.set('limit', '200');

      const r = await fetch('/api/outreach/email-sends?' + params.toString());
      const j = await r.json();
      setOutreachRows((j.rows || []) as OutreachEmailSend[]);
    } finally {
      setOutreachLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'outreach') { loadOutreachSends(); }
  }, [tab]);

  return {
    outreachLeadId, setOutreachLeadId,
    outreachEmail, setOutreachEmail,
    outreachFrom, setOutreachFrom,
    outreachTo, setOutreachTo,
    outreachRows, outreachLoading,
    outreachExpanded, setOutreachExpanded,
    loadOutreachSends,
  };
}
