import { useEffect, useState } from 'react';
import {
  Anchor, AppShell, Autocomplete, Button, Group, Modal, NumberInput, Select,
  SimpleGrid, Stack, Text, TextInput, Textarea, Tooltip, ActionIcon, ScrollArea,
  Table,
} from '@mantine/core';
import { IconNotes, IconDownload, IconEdit, IconTrash, IconEye } from '@tabler/icons-react';

import type { Interview } from './types';
import { useLocalLang } from './i18n';
import { useAuth } from './hooks/useAuth';
import { useLeads } from './hooks/useLeads';
import { useDashboard } from './hooks/useDashboard';
import { useEnrich } from './hooks/useEnrich';
import { useInterviews } from './hooks/useInterviews';
import { useOutreach } from './hooks/useOutreach';
import { useAgent } from './hooks/useAgent';
import { AppHeader } from './components/layout/AppHeader';
import { TabNavigation } from './components/layout/TabNavigation';
import { AgentTab } from './components/agent/AgentTab';
import { LeadsTab } from './components/leads/LeadsTab';
import { OutreachTab } from './components/outreach/OutreachTab';
import { InterviewsTab } from './components/interviews/InterviewsTab';
import { InterviewDetailModal } from './components/interviews/InterviewDetailModal';
import { EnrichTab } from './components/enrich/EnrichTab';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { ConfirmModal } from './components/shared';

import './theme/animations.css';

export function App() {
  const { lang, setLang, t } = useLocalLang();
  const { me } = useAuth();

  const [tab, setTab] = useState<string | null>(() => localStorage.getItem('pingcomp_tab') || 'agent');

  useEffect(() => {
    if (tab) localStorage.setItem('pingcomp_tab', tab);
  }, [tab]);

  const leads = useLeads(tab, me?.email);
  const { dash, loadDashboard } = useDashboard(tab);
  const enrich = useEnrich(tab);
  const interviews = useInterviews(tab);
  const outreach = useOutreach(tab);
  const agent = useAgent();
  const [interviewDetailCtx, setInterviewDetailCtx] = useState<{ ids: number[]; index: number } | null>(null);

  function openInterviewDetail(ids: number[], index: number) {
    if (!ids.length || index < 0 || index >= ids.length) return;
    setInterviewDetailCtx({ ids, index });
  }

  function closeInterviewDetail() {
    setInterviewDetailCtx(null);
  }

  function showInterviewDetailFromRows(rows: Interview[], index: number) {
    openInterviewDetail(rows.map((row) => row.id), index);
  }

  // Dashboard needs refreshing after lead mutations
  const originalSaveLead = leads.saveLead;
  const saveLead = async () => { await originalSaveLead(t); await loadDashboard(); };
  const originalCreateLead = leads.createLead;
  const createLead = async () => { await originalCreateLead(t); await loadDashboard(); };
  const originalConfirmDelete = leads.confirmDelete;
  const confirmDelete = async () => { await originalConfirmDelete(); await loadDashboard(); };
  const originalApplyBulk = leads.applyBulk;
  const applyBulk = async () => { await originalApplyBulk(); await loadDashboard(); };

  // Interview save handler (shared between lead-interview modal and interview tab)
  async function saveInterview() {
    const ctx = leads.editInterviewCtx;
    const draft = leads.editInterviewDraft;
    if (!ctx || !draft) return;

    const payload: any = {
      leadId: ctx.leadId,
      title: draft.title,
      interviewDate: draft.interviewDate,
      channel: draft.channel,
      interviewer: draft.interviewer,
      company: draft.company,
      contactName: draft.contactName,
      contactRole: draft.contactRole,
      tags: String(draft.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      summary: draft.summary,
      painPoints: draft.painPoints,
      currentSolution: draft.currentSolution,
      requirements: draft.requirements,
      objectionsRisks: draft.objectionsRisks,
      nextSteps: draft.nextSteps,
      transcriptHtml: draft.transcriptHtml,
    };

    if (ctx.mode === 'create') {
      await fetch('/api/interviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetch(`/api/interviews/${ctx.row!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }

    leads.setEditInterviewCtx(null);
    leads.setEditInterviewDraft(null);

    if (leads.leadInterviewsCtx) {
      leads.setLeadInterviewsRows([]);
      leads.setLeadInterviewsCursor(null);
      await leads.loadLeadInterviews({ reset: true });
    }

    if (tab === 'interviews') {
      await interviews.loadInterviews({ pageOverride: interviews.interviewsPage });
    }
  }

  return (
    <AppShell padding="md">
      <Stack gap={0} className="pc-smooth">
        <AppHeader t={t} lang={lang} setLang={setLang} me={me} />

        <TabNavigation tab={tab} setTab={setTab} t={t}>
          <AgentTab
            agentInput={agent.agentInput}
            setAgentInput={agent.setAgentInput}
            agentLoading={agent.agentLoading}
            agentComposing={agent.agentComposing}
            setAgentComposing={agent.setAgentComposing}
            agentSessions={agent.agentSessions}
            currentSession={agent.currentSession}
            currentSessionId={agent.currentSessionId}
            setCurrentSessionId={agent.setCurrentSessionId}
            agentTurns={agent.agentTurns}
            askAgent={agent.askAgent}
            createSession={agent.createSession}
            deleteCurrentSession={agent.deleteCurrentSession}
            t={t}
          />

          <LeadsTab
            rows={leads.rows}
            q={leads.q} setQ={leads.setQ}
            minScore={leads.minScore} setMinScore={leads.setMinScore}
            status={leads.status} setStatus={leads.setStatus}
            region={leads.region} setRegion={leads.setRegion}
            regionOptions={leads.regionOptions}
            regionSearch={leads.regionSearch} setRegionSearch={leads.setRegionSearch}
            regionLoading={leads.regionLoading}
            lockedOnly={leads.lockedOnly} setLockedOnly={leads.setLockedOnly}
            showMoreFilters={leads.showMoreFilters} setShowMoreFilters={leads.setShowMoreFilters}
            compactMode={leads.compactMode} setCompactMode={leads.setCompactMode}
            page={leads.page} setPage={leads.setPage}
            pageSize={leads.pageSize} setPageSize={leads.setPageSize}
            totalPages={leads.totalPages} totalRows={leads.totalRows}
            loading={leads.loading}
            selectedIds={leads.selectedIds} setSelectedIds={leads.setSelectedIds}
            bulkAction={leads.bulkAction} setBulkAction={leads.setBulkAction}
            recentEditedIds={leads.recentEditedIds}
            sortKey={leads.sortKey} sortDir={leads.sortDir} setSort={leads.setSort}
            statusOptions={leads.statusOptions} bulkOptions={leads.bulkOptions}
            allChecked={leads.allChecked}
            setSelected={leads.setSelected}
            setCreateLeadOpen={leads.setCreateLeadOpen}
            setCreateLeadDraft={leads.setCreateLeadDraft}
            me={me}
            applyBulk={applyBulk}
            applyQuickView={leads.applyQuickView}
            savedViews={leads.savedViews}
            selectedSavedView={leads.selectedSavedView}
            newViewName={leads.newViewName} setNewViewName={leads.setNewViewName}
            saveCurrentView={leads.saveCurrentView}
            applySavedView={leads.applySavedView}
            deleteSavedView={leads.deleteSavedView}
            requestDeleteOne={leads.requestDeleteOne}
            setLeadInterviewsCtx={leads.setLeadInterviewsCtx}
            t={t}
          />

          <OutreachTab
            outreachLeadId={outreach.outreachLeadId} setOutreachLeadId={outreach.setOutreachLeadId}
            outreachEmail={outreach.outreachEmail} setOutreachEmail={outreach.setOutreachEmail}
            outreachFrom={outreach.outreachFrom} setOutreachFrom={outreach.setOutreachFrom}
            outreachTo={outreach.outreachTo} setOutreachTo={outreach.setOutreachTo}
            outreachPage={outreach.outreachPage} setOutreachPage={outreach.setOutreachPage}
            outreachPageSize={outreach.outreachPageSize} setOutreachPageSize={outreach.setOutreachPageSize}
            outreachTotalPages={outreach.outreachTotalPages} outreachTotalRows={outreach.outreachTotalRows}
            outreachRows={outreach.outreachRows}
            outreachLoading={outreach.outreachLoading}
            outreachExpanded={outreach.outreachExpanded} setOutreachExpanded={outreach.setOutreachExpanded}
            loadOutreachSends={outreach.loadOutreachSends}
            t={t}
          />

          <InterviewsTab
            interviewsTabQ={interviews.interviewsTabQ} setInterviewsTabQ={interviews.setInterviewsTabQ}
            interviewsTabLeadId={interviews.interviewsTabLeadId} setInterviewsTabLeadId={interviews.setInterviewsTabLeadId}
            interviewsTabChannel={interviews.interviewsTabChannel} setInterviewsTabChannel={interviews.setInterviewsTabChannel}
            interviewsTabInterviewer={interviews.interviewsTabInterviewer} setInterviewsTabInterviewer={interviews.setInterviewsTabInterviewer}
            interviewsTabTags={interviews.interviewsTabTags} setInterviewsTabTags={interviews.setInterviewsTabTags}
            interviewsTabDatePreset={interviews.interviewsTabDatePreset} setInterviewsTabDatePreset={interviews.setInterviewsTabDatePreset}
            interviewsTabDateFrom={interviews.interviewsTabDateFrom} setInterviewsTabDateFrom={interviews.setInterviewsTabDateFrom}
            interviewsTabDateTo={interviews.interviewsTabDateTo} setInterviewsTabDateTo={interviews.setInterviewsTabDateTo}
            showMoreFilters={interviews.showMoreFilters} setShowMoreFilters={interviews.setShowMoreFilters}
            interviewsRows={interviews.interviewsRows}
            interviewsPage={interviews.interviewsPage} setInterviewsPage={interviews.setInterviewsPage}
            interviewsPageSize={interviews.interviewsPageSize} setInterviewsPageSize={interviews.setInterviewsPageSize}
            interviewsTotalPages={interviews.interviewsTotalPages} interviewsTotalRows={interviews.interviewsTotalRows}
            interviewsLoading={interviews.interviewsLoading}
            resetInterviewsFilters={interviews.resetInterviewsFilters}
            getExportParams={interviews.getExportParams}
            openInterviewEditor={leads.openInterviewEditor}
            openInterviewDetail={(index) => showInterviewDetailFromRows(interviews.interviewsRows, index)}
            t={t}
          />

          <EnrichTab
            enrich={enrich.enrich}
            enqueueIds={enrich.enqueueIds} setEnqueueIds={enrich.setEnqueueIds}
            enqueue={enrich.enqueue}
            runEnrichBatch={enrich.runEnrichBatch}
            recentEditedIds={leads.recentEditedIds}
            t={t}
          />

          <DashboardTab dash={dash} t={t} />
        </TabNavigation>
      </Stack>

      {/* Footer */}
      <Group justify="center" mt="md" mb="xs">
        <Text size="xs" c="dimmed" className="pc-footer-brand">
          Powered by{' '}
          <Anchor href="https://tidbcloud.com" target="_blank" rel="noreferrer" underline="hover" style={{ color: 'var(--mantine-color-blue-4)' }}>TiDB Cloud</Anchor>
          {' '} &amp; {' '}
          <Anchor href="https://openclaw.ai" target="_blank" rel="noreferrer" underline="hover" style={{ color: 'var(--mantine-color-violet-4)' }}>OpenClaw</Anchor>
        </Text>
      </Group>

      {/* Create Lead Modal */}
      <Modal opened={leads.createLeadOpen} onClose={() => leads.setCreateLeadOpen(false)} title={t.addLeadTitle} size="lg">
        <Stack>
          <TextInput label="Name" value={leads.createLeadDraft.name} onChange={(e) => leads.setCreateLeadDraft({ ...leads.createLeadDraft, name: e.currentTarget.value })} />
          <TextInput label="Vertical" value={leads.createLeadDraft.vertical} onChange={(e) => leads.setCreateLeadDraft({ ...leads.createLeadDraft, vertical: e.currentTarget.value })} />
          <Group grow>
            <TextInput label="Region" value={leads.createLeadDraft.region} onChange={(e) => leads.setCreateLeadDraft({ ...leads.createLeadDraft, region: e.currentTarget.value })} />
            <TextInput label="City" value={leads.createLeadDraft.city} onChange={(e) => leads.setCreateLeadDraft({ ...leads.createLeadDraft, city: e.currentTarget.value })} />
          </Group>
          <Group grow>
            <TextInput label="Source" value={leads.createLeadDraft.source} onChange={(e) => leads.setCreateLeadDraft({ ...leads.createLeadDraft, source: e.currentTarget.value })} />
            <Select label="Status" data={leads.statusOptions} value={leads.createLeadDraft.lead_status} onChange={(v) => leads.setCreateLeadDraft({ ...leads.createLeadDraft, lead_status: v || 'new' })} />
          </Group>
          <Group grow>
            <Autocomplete
              label="Owner"
              data={leads.ownerOptions}
              value={leads.createLeadDraft.owner}
              onChange={(v) => leads.setCreateLeadDraft({ ...leads.createLeadDraft, owner: v })}
              placeholder="Search or type new owner"
            />
            <Autocomplete
              label="Creator"
              data={leads.creatorOptions}
              value={leads.createLeadDraft.creator}
              onChange={(v) => leads.setCreateLeadDraft({ ...leads.createLeadDraft, creator: v })}
              placeholder="Search or type new creator"
            />
          </Group>
          <Textarea label={t.emails} minRows={3} value={leads.createLeadDraft.emails} onChange={(e) => leads.setCreateLeadDraft({ ...leads.createLeadDraft, emails: e.currentTarget.value })} />
          <NumberInput label="Score" min={0} max={100} value={leads.createLeadDraft.tidb_potential_score} onChange={(v: any) => leads.setCreateLeadDraft({ ...leads.createLeadDraft, tidb_potential_score: Number(v || 0) })} />
          <Textarea label="Reason" minRows={6} value={leads.createLeadDraft.tidb_potential_reason} onChange={(e) => leads.setCreateLeadDraft({ ...leads.createLeadDraft, tidb_potential_reason: e.currentTarget.value })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => leads.setCreateLeadOpen(false)}>{t.cancel}</Button>
            <Button loading={leads.createLeadSubmitting} onClick={createLead}>{t.createLead}</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal opened={!!leads.selected} onClose={() => leads.setSelected(null)} title={leads.selected?.name || t.edit} size="lg">
        {leads.selected && (
          <Stack>
            <TextInput label="Name" value={leads.selected.name || ''} onChange={(e) => leads.setSelected({ ...leads.selected!, name: e.currentTarget.value })} />
            <TextInput label="Vertical" value={leads.selected.vertical || ''} onChange={(e) => leads.setSelected({ ...leads.selected!, vertical: e.currentTarget.value })} />
            <TextInput label="Region" value={leads.selected.region || ''} onChange={(e) => leads.setSelected({ ...leads.selected!, region: e.currentTarget.value })} />
            <TextInput label="City" value={leads.selected.city || ''} onChange={(e) => leads.setSelected({ ...leads.selected!, city: e.currentTarget.value })} />
            <Select label="Status" data={leads.statusOptions} value={leads.selected.lead_status} onChange={(v) => leads.setSelected({ ...leads.selected!, lead_status: v || 'new' })} />
            <Group grow>
              <Autocomplete
                label="Owner"
                data={leads.ownerOptions}
                value={leads.selected.owner || ''}
                onChange={(v) => leads.setSelected({ ...leads.selected!, owner: v })}
                placeholder="Search or type new owner"
              />
              <Autocomplete
                label="Creator"
                data={leads.creatorOptions}
                value={leads.selected.creator || ''}
                onChange={(v) => leads.setSelected({ ...leads.selected!, creator: v })}
                placeholder="Search or type new creator"
              />
            </Group>
            <Textarea label={t.emails} description="Comma/newline separated. Saved to lead.emails." minRows={3} maxRows={6} autosize value={(leads.selected.emails as any) || ''} onChange={(e) => leads.setSelected({ ...leads.selected!, emails: e.currentTarget.value })} />
            <NumberInput label="Score" min={0} max={100} value={leads.selected.tidb_potential_score ?? 0} onChange={(v: any) => leads.setSelected({ ...leads.selected!, tidb_potential_score: Number(v) })} />
            <Textarea label="Reason" minRows={14} maxRows={14} autosize value={leads.selected.tidb_potential_reason || ''} onChange={(e) => leads.setSelected({ ...leads.selected!, tidb_potential_reason: e.currentTarget.value })} />
            <Button onClick={saveLead}>{t.saveLock}</Button>
          </Stack>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        opened={!!leads.deleteCtx}
        onClose={() => leads.setDeleteCtx(null)}
        onConfirm={confirmDelete}
        title={t.deleteModalTitle}
        description={t.deleteModalDesc}
        detail={leads.deleteCtx?.mode === 'bulk' ? `${leads.deleteCtx.ids.length} items selected.` : t.deleteConfirm}
        cancelLabel={t.cancel}
        confirmLabel={t.confirmDelete}
      />

      {/* Lead Interviews Modal */}
      <Modal
        opened={!!leads.leadInterviewsCtx}
        onClose={() => {
          leads.leadInterviewsLoadSeq.current += 1;
          leads.setLeadInterviewsCtx(null);
          leads.setLeadInterviewsRows([]);
          leads.setLeadInterviewsCursor(null);
          leads.setLeadInterviewsLoading(false);
        }}
        title={leads.leadInterviewsCtx ? `Lead Interviews · ${leads.leadInterviewsCtx.lead.name} (#${leads.leadInterviewsCtx.lead.id})` : 'Lead Interviews'}
        size="xl"
      >
        {leads.leadInterviewsCtx ? (
          <Stack>
            <Group justify="space-between" wrap="wrap">
              <Group gap={8}>
                <Button leftSection={<IconNotes size={14} />} onClick={() => {
                  leads.setEditInterviewCtx({ mode: 'create', leadId: leads.leadInterviewsCtx!.lead.id });
                  leads.setEditInterviewDraft({
                    title: `${leads.leadInterviewsCtx!.lead.name} - ${new Date().toISOString().slice(0, 10)}`,
                    interviewDate: new Date().toISOString().slice(0, 10),
                    channel: 'meeting',
                    interviewer: '',
                    company: leads.leadInterviewsCtx!.lead.name,
                    contactName: '',
                    contactRole: '',
                    tags: '',
                    summary: '',
                    painPoints: '',
                    currentSolution: '',
                    requirements: '',
                    objectionsRisks: '',
                    nextSteps: '',
                    transcriptHtml: '<p></p>'
                  });
                }}>New Interview</Button>
                <Button variant="light" leftSection={<IconDownload size={14} />} onClick={() => window.open(`/interviews/export.md?leadId=${leads.leadInterviewsCtx!.lead.id}`, '_blank')}>Export lead md</Button>
              </Group>
              <Button variant="default" disabled={leads.leadInterviewsLoading} onClick={() => { leads.setLeadInterviewsRows([]); leads.setLeadInterviewsCursor(null); leads.loadLeadInterviews({ reset: true }); }}>Refresh</Button>
            </Group>

            <ScrollArea>
              <Table withTableBorder withColumnBorders striped highlightOnHover miw={1100}>
                <Table.Thead>
                  <Table.Tr><Table.Th>ID</Table.Th><Table.Th>Title</Table.Th><Table.Th>Date</Table.Th><Table.Th>Channel</Table.Th><Table.Th>Interviewer</Table.Th><Table.Th>Tags</Table.Th><Table.Th>Action</Table.Th></Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {leads.leadInterviewsRows.length === 0 ? (
                    <Table.Tr><Table.Td colSpan={7}><Text c="dimmed" ta="center" py="md">{leads.leadInterviewsLoading ? 'loading...' : t.noData}</Text></Table.Td></Table.Tr>
                  ) : leads.leadInterviewsRows.map((it, index) => (
                    <Table.Tr key={it.id}>
                      <Table.Td>{it.id}</Table.Td>
                      <Table.Td style={{ maxWidth: 420 }}>
                        <Tooltip withArrow label={it.title}>
                          <Text
                            fw={600}
                            lineClamp={1}
                            component="button"
                            type="button"
                            onClick={() => showInterviewDetailFromRows(leads.leadInterviewsRows, index)}
                            style={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              background: 'transparent',
                              border: 0,
                              padding: 0,
                              cursor: 'pointer',
                              color: 'var(--mantine-color-blue-6)',
                            }}
                          >
                            {it.title}
                          </Text>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>{(it.interview_date || '').slice(0, 10)}</Table.Td>
                      <Table.Td>{it.channel}</Table.Td>
                      <Table.Td>{it.interviewer || '-'}</Table.Td>
                      <Table.Td><Text size="xs" c="dimmed" lineClamp={1}>{it.tags || '-'}</Text></Table.Td>
                      <Table.Td>
                        <Group gap={6}>
                          <Tooltip withArrow label="Edit">
                            <ActionIcon variant="light" color="blue" onClick={() => leads.openInterviewEditor(it)}><IconEdit size={14} /></ActionIcon>
                          </Tooltip>
                          <Tooltip withArrow label="View detail">
                            <ActionIcon variant="light" color="grape" onClick={() => showInterviewDetailFromRows(leads.leadInterviewsRows, index)}><IconEye size={14} /></ActionIcon>
                          </Tooltip>
                          <Tooltip withArrow label="Export">
                            <ActionIcon variant="light" onClick={() => window.open(`/interviews/${it.id}/export.md`, '_blank')}><IconDownload size={14} /></ActionIcon>
                          </Tooltip>
                          <Tooltip withArrow label="Delete">
                            <ActionIcon variant="light" color="red" onClick={async () => {
                              const ok = window.confirm('Soft delete this interview?');
                              if (!ok) return;
                              await fetch(`/api/interviews/${it.id}`, { method: 'DELETE' });
                              leads.setLeadInterviewsRows([]); leads.setLeadInterviewsCursor(null);
                              await leads.loadLeadInterviews({ reset: true });
                            }}><IconTrash size={14} /></ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            <Group justify="flex-end" mt="sm">
              <Button variant="default" disabled={!leads.leadInterviewsCursor || leads.leadInterviewsLoading} onClick={() => leads.loadLeadInterviews({ reset: false })}>
                {leads.leadInterviewsCursor ? 'Load more' : 'All loaded'}
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>

      {/* Edit Interview Modal */}
      <Modal
        opened={!!leads.editInterviewCtx}
        onClose={() => { leads.setEditInterviewCtx(null); leads.setEditInterviewDraft(null); }}
        title={leads.editInterviewCtx?.mode === 'create' ? `New Interview (Lead #${leads.editInterviewCtx.leadId})` : `Edit Interview #${leads.editInterviewCtx?.row?.id || ''}`}
        size="xl"
      >
        {leads.editInterviewCtx && leads.editInterviewDraft ? (
          <Stack>
            <Group grow>
              <TextInput label="Title" value={leads.editInterviewDraft.title || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, title: e.currentTarget.value })} />
              <TextInput label="Interview Date" placeholder="YYYY-MM-DD" value={leads.editInterviewDraft.interviewDate || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, interviewDate: e.currentTarget.value })} />
              <TextInput label="Channel" value={leads.editInterviewDraft.channel || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, channel: e.currentTarget.value })} />
            </Group>
            <Group grow>
              <TextInput label="Interviewer" value={leads.editInterviewDraft.interviewer || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, interviewer: e.currentTarget.value })} />
              <TextInput label="Company" value={leads.editInterviewDraft.company || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, company: e.currentTarget.value })} />
              <TextInput label="Tags (comma)" value={leads.editInterviewDraft.tags || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, tags: e.currentTarget.value })} />
            </Group>
            <Group grow>
              <TextInput label="Contact Name" value={leads.editInterviewDraft.contactName || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, contactName: e.currentTarget.value })} />
              <TextInput label="Contact Role" value={leads.editInterviewDraft.contactRole || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, contactRole: e.currentTarget.value })} />
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Textarea label="Summary" minRows={4} value={leads.editInterviewDraft.summary || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, summary: e.currentTarget.value })} />
              <Textarea label="Pain Points" minRows={4} value={leads.editInterviewDraft.painPoints || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, painPoints: e.currentTarget.value })} />
              <Textarea label="Current Solution" minRows={4} value={leads.editInterviewDraft.currentSolution || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, currentSolution: e.currentTarget.value })} />
              <Textarea label="Requirements" minRows={4} value={leads.editInterviewDraft.requirements || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, requirements: e.currentTarget.value })} />
              <Textarea label="Objections / Risks" minRows={4} value={leads.editInterviewDraft.objectionsRisks || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, objectionsRisks: e.currentTarget.value })} />
              <Textarea label="Next Steps" minRows={4} value={leads.editInterviewDraft.nextSteps || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, nextSteps: e.currentTarget.value })} />
            </SimpleGrid>

            <Textarea label="Transcript (HTML)" description="MVP stores HTML; plain text is derived on save." minRows={10} value={leads.editInterviewDraft.transcriptHtml || ''} onChange={(e) => leads.setEditInterviewDraft({ ...leads.editInterviewDraft, transcriptHtml: e.currentTarget.value })} />

            <Group justify="flex-end">
              <Button variant="default" onClick={() => { leads.setEditInterviewCtx(null); leads.setEditInterviewDraft(null); }}>Cancel</Button>
              <Button onClick={saveInterview}>Save</Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>

      <InterviewDetailModal
        opened={!!interviewDetailCtx}
        interviewId={interviewDetailCtx ? interviewDetailCtx.ids[interviewDetailCtx.index] : null}
        currentIndex={interviewDetailCtx?.index || 0}
        total={interviewDetailCtx?.ids.length || 0}
        onClose={closeInterviewDetail}
        onPrev={() => setInterviewDetailCtx((current) => current && current.index > 0 ? { ...current, index: current.index - 1 } : current)}
        onNext={() => setInterviewDetailCtx((current) => current && current.index < current.ids.length - 1 ? { ...current, index: current.index + 1 } : current)}
      />
    </AppShell>
  );
}
