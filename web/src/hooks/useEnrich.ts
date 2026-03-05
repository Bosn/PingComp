import { useEffect, useState } from 'react';
import type { EnrichPayload } from '../types';

export function useEnrich(tab: string | null) {
  const [enrich, setEnrich] = useState<EnrichPayload | null>(null);
  const [enqueueIds, setEnqueueIds] = useState('');

  async function loadEnrich() {
    const r = await fetch('/api/enrich/queue');
    setEnrich(await r.json());
  }

  async function runEnrichBatch() {
    await fetch('/api/enrich/run', { method: 'POST' });
    await loadEnrich();
  }

  async function enqueue() {
    await fetch('/api/enrich/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: enqueueIds }),
    });
    setEnqueueIds('');
    await loadEnrich();
  }

  useEffect(() => {
    if (tab === 'enrich') loadEnrich();
  }, [tab]);

  return { enrich, enqueueIds, setEnqueueIds, loadEnrich, runEnrichBatch, enqueue };
}
