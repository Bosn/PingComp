import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lead, SavedView, SortKey, Interview } from '../types';

export function useLeads(tab: string | null, meEmail?: string) {
  const [rows, setRows] = useState<Lead[]>([]);
  const [q, setQ] = useState('');
  const [minScore, setMinScore] = useState<number>(0);
  const [status, setStatus] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [regionOptions, setRegionOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [regionSearch, setRegionSearch] = useState('');
  const [regionLoading, setRegionLoading] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState<string[]>([]);
  const [creatorOptions, setCreatorOptions] = useState<string[]>([]);
  const [lockedOnly, setLockedOnly] = useState<boolean>(false);
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);
  const [compactMode, setCompactMode] = useState<boolean>(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<string>('15');
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [recentEditedIds, setRecentEditedIds] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteCtx, setDeleteCtx] = useState<{ ids: number[]; mode: 'single' | 'bulk' } | null>(null);

  // Create lead
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createLeadSubmitting, setCreateLeadSubmitting] = useState(false);
  const [createLeadDraft, setCreateLeadDraft] = useState<any>({
    name: '', vertical: '', region: '', city: '', source: 'manual',
    lead_status: 'new', owner: '', creator: '', emails: '', tidb_potential_score: 0, tidb_potential_reason: '',
  });

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    try { return JSON.parse(localStorage.getItem('pingcomp_saved_views') || '[]'); } catch { return []; }
  });
  const [selectedSavedView, setSelectedSavedView] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState('');

  // Lead interviews modal
  const [leadInterviewsCtx, setLeadInterviewsCtx] = useState<{ lead: Lead } | null>(null);
  const [leadInterviewsRows, setLeadInterviewsRows] = useState<Interview[]>([]);
  const [leadInterviewsCursor, setLeadInterviewsCursor] = useState<string | null>(null);
  const [leadInterviewsLoading, setLeadInterviewsLoading] = useState(false);
  const leadInterviewsLoadSeq = useRef(0);

  // Interview editor
  const [editInterviewCtx, setEditInterviewCtx] = useState<{ mode: 'create' | 'edit'; leadId: number; row?: Interview } | null>(null);
  const [editInterviewDraft, setEditInterviewDraft] = useState<any>(null);

  const statusOptions = useMemo(() => [
    { value: 'new', label: 'new' }, { value: 'contacted', label: 'contacted' },
    { value: 'qualified', label: 'qualified' }, { value: 'disqualified', label: 'disqualified' },
  ], []);

  const bulkOptions = useMemo(() => [
    { value: 'lock', label: 'lock' },
    { value: 'unlock', label: 'unlock' },
    { value: 'status:new', label: 'status:new' },
    { value: 'status:contacted', label: 'status:contacted' },
    { value: 'status:qualified', label: 'status:qualified' },
    { value: 'status:disqualified', label: 'status:disqualified' },
    { value: 'delete', label: 'delete' },
  ], []);

  const loadLeads = useCallback(async (pageOverride?: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (minScore > 0) params.set('minScore', String(minScore));
    if (status) params.set('status', status);
    if ((region || '').trim()) params.set('region', (region || '').trim());
    if (lockedOnly) params.set('locked', '1');
    const activePage = pageOverride ?? page;
    params.set('page', String(activePage));
    params.set('pageSize', String(Number(pageSize) || 15));
    const sortMap: Record<string, string> = {
      id: 'id', name: 'name', score: 'score', lead_status: 'status', owner: 'owner', vertical: 'vertical', created_at: 'created', updated_at: 'updated'
    };
    params.set('sort', `${sortMap[sortKey] || 'updated'}_${sortDir}`);
    const r = await fetch(`/api/leads?${params.toString()}`);
    const j = await r.json();
    setRows(j.rows || []); setTotalPages(j.totalPages || 1); setTotalRows(j.total || 0); setLoading(false);
    setSelectedIds(new Set());
  }, [q, minScore, status, region, lockedOnly, page, pageSize, sortKey, sortDir]);

  async function loadRegions(searchQ = '') {
    setRegionLoading(true);
    try {
      const r = await fetch(`/api/regions?q=${encodeURIComponent(searchQ)}`);
      const j = await r.json();
      setRegionOptions((j.rows || []).map((x: any) => ({ value: x.value, label: x.label })));
    } finally {
      setRegionLoading(false);
    }
  }

  async function loadFieldValues(field: 'owner' | 'creator', searchQ = '') {
    const r = await fetch(`/api/field-values?field=${field}&q=${encodeURIComponent(searchQ)}`);
    const j = await r.json();
    const vals = (j.rows || []).map((x: any) => String(x.value || '').trim()).filter(Boolean);
    if (field === 'owner') setOwnerOptions(vals);
    else setCreatorOptions(vals);
  }

  function markRecentEdited(ids: number[]) {
    if (!ids.length) return;
    setRecentEditedIds(prev => {
      const n = new Set(prev);
      ids.forEach(id => n.add(id));
      return n;
    });
    window.setTimeout(() => {
      setRecentEditedIds(prev => {
        const n = new Set(prev);
        ids.forEach(id => n.delete(id));
        return n;
      });
    }, 120000);
  }

  const setSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  async function saveLead() {
    if (!selected) return;
    const emailParts = String((selected as any).emails || '')
      .split(/[,\n]+/g)
      .map(s => s.trim())
      .filter(Boolean);
    await fetch(`/api/leads/${selected.id}/emails`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: emailParts }),
    });
    await fetch(`/api/leads/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selected) });
    setSelected(null);
    markRecentEdited([selected.id]);
    await loadLeads();
  }

  async function createLead(t: { nameVerticalRequired: string; createLeadFailed: string }) {
    const name = String(createLeadDraft.name || '').trim();
    const vertical = String(createLeadDraft.vertical || '').trim();
    if (!name || !vertical) {
      window.alert(t.nameVerticalRequired);
      return;
    }
    setCreateLeadSubmitting(true);
    try {
      const payload = {
        name,
        vertical,
        region: String(createLeadDraft.region || '').trim(),
        city: String(createLeadDraft.city || '').trim(),
        source: String(createLeadDraft.source || 'manual').trim() || 'manual',
        lead_status: String(createLeadDraft.lead_status || 'new').trim() || 'new',
        owner: String(createLeadDraft.owner || '').trim() || null,
        creator: String(createLeadDraft.creator || '').trim() || null,
        emails: String(createLeadDraft.emails || ''),
        tidb_potential_score: Number(createLeadDraft.tidb_potential_score || 0),
        tidb_potential_reason: String(createLeadDraft.tidb_potential_reason || ''),
      };
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || 'create failed');
      setCreateLeadOpen(false);
      setCreateLeadDraft({ name: '', vertical: '', region: '', city: '', source: 'manual', lead_status: 'new', owner: '', creator: meEmail || '', emails: '', tidb_potential_score: 0, tidb_potential_reason: '' });
      markRecentEdited([Number(j.id)]);
      await loadLeads();
    } catch (e: any) {
      window.alert(`${t.createLeadFailed}: ${e?.message || e}`);
    } finally {
      setCreateLeadSubmitting(false);
    }
  }

  async function applyBulk() {
    if (!bulkAction || selectedIds.size === 0) return;
    if (bulkAction === 'delete') {
      setDeleteCtx({ ids: [...selectedIds], mode: 'bulk' });
      return;
    }
    await fetch('/api/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedIds].join(','), action: bulkAction }),
    });
    markRecentEdited([...selectedIds]);
    await loadLeads();
  }

  function applyQuickView(kind: 'high' | 'locked' | 'followup' | 'all') {
    if (kind === 'high') {
      setQ(''); setMinScore(80); setStatus('new'); setRegion(null); setLockedOnly(false);
    } else if (kind === 'locked') {
      setQ(''); setMinScore(0); setStatus(null); setRegion(null); setLockedOnly(true);
    } else if (kind === 'followup') {
      setQ(''); setMinScore(0); setStatus('contacted'); setRegion(null); setLockedOnly(false);
    } else {
      setQ(''); setMinScore(0); setStatus(null); setRegion(null); setLockedOnly(false);
    }
    setPage(1);
  }

  function persistViews(next: SavedView[]) {
    setSavedViews(next);
    localStorage.setItem('pingcomp_saved_views', JSON.stringify(next));
  }

  function saveCurrentView() {
    const name = newViewName.trim();
    if (!name) return;
    const view: SavedView = { name, q, minScore, status, region: region || '', lockedOnly };
    const next = [view, ...savedViews.filter(v => v.name !== name)].slice(0, 12);
    persistViews(next);
    setSelectedSavedView(name);
    setNewViewName('');
  }

  function applySavedView(name: string | null) {
    setSelectedSavedView(name);
    const v = savedViews.find(x => x.name === name);
    if (!v) return;
    setQ(v.q); setMinScore(v.minScore); setStatus(v.status); setRegion(v.region || null); setLockedOnly(v.lockedOnly);
    setPage(1);
  }

  function deleteSavedView() {
    if (!selectedSavedView) return;
    const next = savedViews.filter(v => v.name !== selectedSavedView);
    persistViews(next);
    setSelectedSavedView(null);
  }

  function requestDeleteOne(id: number) {
    setDeleteCtx({ ids: [id], mode: 'single' });
  }

  async function confirmDelete() {
    if (!deleteCtx) return;
    if (deleteCtx.mode === 'single') {
      await fetch(`/api/leads/${deleteCtx.ids[0]}`, { method: 'DELETE' });
    } else {
      await fetch('/api/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deleteCtx.ids.join(','), action: 'delete' }),
      });
    }
    markRecentEdited(deleteCtx.ids);
    setDeleteCtx(null);
    await loadLeads();
  }

  // Lead interviews
  async function loadLeadInterviews(opts?: { reset?: boolean; leadId?: number }) {
    const activeLeadId = opts?.leadId || leadInterviewsCtx?.lead.id;
    if (!activeLeadId) return;
    const seq = ++leadInterviewsLoadSeq.current;
    setLeadInterviewsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('leadId', String(activeLeadId));
      params.set('limit', '50');
      if (!opts?.reset && leadInterviewsCursor) params.set('cursor', leadInterviewsCursor);
      const r = await fetch(`/api/interviews?${params.toString()}`);
      const j = await r.json();
      const next = (j.rows || []) as Interview[];
      if (seq !== leadInterviewsLoadSeq.current) return;
      setLeadInterviewsRows(opts?.reset ? next : [...leadInterviewsRows, ...next]);
      setLeadInterviewsCursor(j.nextCursor || null);
    } finally {
      if (seq === leadInterviewsLoadSeq.current) setLeadInterviewsLoading(false);
    }
  }

  function toInterviewDraft(it: Interview) {
    return {
      title: it.title,
      interviewDate: it.interview_date,
      channel: it.channel,
      interviewer: it.interviewer || '',
      company: it.company || '',
      contactName: it.contact_name || '',
      contactRole: it.contact_role || '',
      tags: (it.tags || ''),
      summary: it.summary || '',
      painPoints: it.pain_points || '',
      currentSolution: it.current_solution || '',
      requirements: it.requirements || '',
      objectionsRisks: it.objections_risks || '',
      nextSteps: it.next_steps || '',
      transcriptHtml: it.transcript_html || '',
    };
  }

  async function openInterviewEditor(it: Interview) {
    let detail = it;
    try {
      const r = await fetch(`/api/interviews/${it.id}`);
      if (r.ok) {
        const j = await r.json();
        if (j?.row) detail = j.row as Interview;
      }
    } catch {}
    setEditInterviewCtx({ mode: 'edit', leadId: detail.lead_id || it.lead_id, row: detail });
    setEditInterviewDraft(toInterviewDraft(detail));
  }

  // Effects
  useEffect(() => {
    if (tab === 'leads') { loadLeads(); loadRegions(''); loadFieldValues('owner'); loadFieldValues('creator'); }
  }, [tab]);

  useEffect(() => {
    const leadId = leadInterviewsCtx?.lead.id;
    if (!leadId) return;
    setLeadInterviewsRows([]);
    setLeadInterviewsCursor(null);
    loadLeadInterviews({ reset: true, leadId });
  }, [leadInterviewsCtx?.lead.id]);

  useEffect(() => {
    if (tab !== 'leads') return;
    const h = window.setTimeout(() => { setPage(1); loadLeads(1); }, 320);
    return () => window.clearTimeout(h);
  }, [q, minScore, status, region, lockedOnly, sortKey, sortDir, pageSize, tab]);

  useEffect(() => {
    if (tab !== 'leads') return;
    loadLeads();
  }, [page]);

  useEffect(() => {
    if (!createLeadOpen) return;
    setCreateLeadDraft((d: any) => ({ ...d, creator: d.creator || meEmail || '' }));
  }, [createLeadOpen, meEmail]);

  useEffect(() => {
    if (tab !== 'leads') return;
    const h = window.setTimeout(() => loadRegions(regionSearch), 260);
    return () => window.clearTimeout(h);
  }, [regionSearch, tab]);

  useEffect(() => {
    if (tab !== 'leads') return;
    if (!createLeadOpen && !selected) return;
    loadFieldValues('owner');
    loadFieldValues('creator');
  }, [createLeadOpen, selected?.id, tab]);

  const allChecked = rows.length > 0 && rows.every(r => selectedIds.has(r.id));

  return {
    rows, q, setQ, minScore, setMinScore, status, setStatus, region, setRegion,
    regionOptions, regionSearch, setRegionSearch, regionLoading,
    ownerOptions, creatorOptions,
    lockedOnly, setLockedOnly, showMoreFilters, setShowMoreFilters,
    compactMode, setCompactMode,
    page, setPage, pageSize, setPageSize, totalPages, totalRows,
    selected, setSelected, loading,
    selectedIds, setSelectedIds, bulkAction, setBulkAction,
    recentEditedIds, sortKey, sortDir, setSort,
    deleteCtx, setDeleteCtx,
    createLeadOpen, setCreateLeadOpen, createLeadSubmitting, createLeadDraft, setCreateLeadDraft,
    savedViews, selectedSavedView, newViewName, setNewViewName,
    leadInterviewsCtx, setLeadInterviewsCtx, leadInterviewsRows, setLeadInterviewsRows,
    leadInterviewsCursor, setLeadInterviewsCursor, leadInterviewsLoading, setLeadInterviewsLoading,
    leadInterviewsLoadSeq,
    editInterviewCtx, setEditInterviewCtx, editInterviewDraft, setEditInterviewDraft,
    statusOptions, bulkOptions, allChecked,
    loadLeads, loadRegions, loadFieldValues,
    markRecentEdited, saveLead, createLead, applyBulk, applyQuickView,
    saveCurrentView, applySavedView, deleteSavedView,
    requestDeleteOne, confirmDelete,
    loadLeadInterviews, toInterviewDraft, openInterviewEditor,
  };
}
