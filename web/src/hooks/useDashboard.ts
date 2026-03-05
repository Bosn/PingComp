import { useEffect, useState } from 'react';
import type { DashboardPayload } from '../types';

export function useDashboard(tab: string | null) {
  const [dash, setDash] = useState<DashboardPayload | null>(null);

  async function loadDashboard() {
    const r = await fetch('/api/dashboard');
    setDash(await r.json());
  }

  useEffect(() => {
    if (tab === 'dashboard') loadDashboard();
  }, [tab]);

  return { dash, loadDashboard };
}
