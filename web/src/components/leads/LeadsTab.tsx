import {
  Tabs, Box, Group, TextInput, Select, Button, Collapse, Slider, Text, Divider,
  ScrollArea, Table, Checkbox, Badge, Tooltip, ActionIcon, ThemeIcon,
} from '@mantine/core';
import { IconFilter, IconLayoutGrid, IconPlus, IconDownload, IconEdit, IconNotes, IconTrash, IconLock, IconBrain } from '@tabler/icons-react';
import { GlassCard, StatusBadge, SortableHeader, PagePagination } from '../shared';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { scoreColor } from '../../theme/colors';
import type { Lead, SortKey, SavedView, Interview } from '../../types';
import type { I18NStrings } from '../../i18n';

type Props = {
  rows: Lead[];
  q: string; setQ: (v: string) => void;
  minScore: number; setMinScore: (v: number) => void;
  status: string | null; setStatus: (v: string | null) => void;
  region: string | null; setRegion: (v: string | null) => void;
  regionOptions: Array<{ value: string; label: string }>;
  regionSearch: string; setRegionSearch: (v: string) => void;
  regionLoading: boolean;
  lockedOnly: boolean; setLockedOnly: (v: boolean) => void;
  showMoreFilters: boolean; setShowMoreFilters: (v: boolean | ((prev: boolean) => boolean)) => void;
  compactMode: boolean; setCompactMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  page: number; setPage: (v: number) => void;
  pageSize: string; setPageSize: (v: string) => void;
  totalPages: number; totalRows: number;
  loading: boolean;
  selectedIds: Set<number>; setSelectedIds: (v: Set<number>) => void;
  bulkAction: string | null; setBulkAction: (v: string | null) => void;
  recentEditedIds: Set<number>;
  sortKey: SortKey; sortDir: 'asc' | 'desc';
  setSort: (k: SortKey) => void;
  statusOptions: Array<{ value: string; label: string }>;
  bulkOptions: Array<{ value: string; label: string }>;
  allChecked: boolean;
  setSelected: (v: Lead | null) => void;
  setCreateLeadOpen: (v: boolean) => void;
  setCreateLeadDraft: (fn: any) => void;
  me: { name?: string; email?: string; picture?: string } | null;
  applyBulk: () => void;
  applyQuickView: (kind: 'high' | 'locked' | 'followup' | 'all') => void;
  savedViews: SavedView[];
  selectedSavedView: string | null;
  newViewName: string; setNewViewName: (v: string) => void;
  saveCurrentView: () => void;
  applySavedView: (name: string | null) => void;
  deleteSavedView: () => void;
  requestDeleteOne: (id: number) => void;
  setLeadInterviewsCtx: (v: { lead: Lead } | null) => void;
  t: I18NStrings;
};

export function LeadsTab(props: Props) {
  const {
    rows, q, setQ, minScore, setMinScore, status, setStatus, region, setRegion,
    regionOptions, regionSearch, setRegionSearch, regionLoading,
    lockedOnly, setLockedOnly, showMoreFilters, setShowMoreFilters,
    compactMode, setCompactMode,
    page, setPage, pageSize, setPageSize, totalPages, totalRows,
    loading, selectedIds, setSelectedIds, bulkAction, setBulkAction,
    recentEditedIds, sortKey, sortDir, setSort,
    statusOptions, bulkOptions, allChecked,
    setSelected, setCreateLeadOpen, setCreateLeadDraft, me,
    applyBulk, applyQuickView,
    savedViews, selectedSavedView, newViewName, setNewViewName,
    saveCurrentView, applySavedView, deleteSavedView,
    requestDeleteOne, setLeadInterviewsCtx, t,
  } = props;

  const { isDark, thStyle } = useThemeStyles();

  return (
    <Tabs.Panel value="leads" pt="md">
      <Box px="md" className="pc-slide-up">
        <GlassCard>
          {/* Header */}
          <Group gap={8} mb="md">
            <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'grape', deg: 135 }} size="md" radius="md">
              <IconBrain size={14} />
            </ThemeIcon>
            <Text fw={700} size="md">Leads</Text>
            <Badge size="sm" variant="light" color="violet">{totalRows}</Badge>
          </Group>

          {/* Filter bar */}
          <Box style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: isDark ? 'rgba(30,41,59,0.4)' : 'rgba(241,245,249,0.6)',
            border: `1px solid ${isDark ? 'rgba(120,140,180,0.15)' : 'rgba(148,163,184,0.12)'}`,
          }}>
            <Group wrap="wrap" align="end" justify="space-between">
              <Group wrap="wrap" align="end">
                <TextInput leftSection={<IconFilter size={14} />} w={320} placeholder={t.search} value={q} onChange={(e) => setQ(e.currentTarget.value)} />
                <Select w={170} placeholder={t.status} data={statusOptions} value={status} onChange={setStatus} clearable />
                <Select w={210} placeholder={t.region} data={regionOptions} value={region} onChange={setRegion} searchable clearable searchValue={regionSearch} onSearchChange={setRegionSearch} rightSection={regionLoading ? <Text size="xs" c="dimmed" style={{ opacity: 0.9 }}>...</Text> : null} />
                <Button variant="default" onClick={() => setShowMoreFilters(v => !v)}>{showMoreFilters ? 'Less' : 'More'}</Button>
                <Button variant="subtle" onClick={() => { setQ(''); setMinScore(0); setStatus(null); setRegion(null); setLockedOnly(false); setPage(1); setShowMoreFilters(false); }}>{t.reset}</Button>
              </Group>
              <Group gap={8}>
                <Tooltip label={compactMode ? 'Comfortable view' : 'Compact view'} withArrow>
                  <ActionIcon variant="default" size="lg" radius="md" onClick={() => setCompactMode(v => !v)}>
                    <IconLayoutGrid size={16} />
                  </ActionIcon>
                </Tooltip>
                <Button variant="gradient" gradient={{ from: 'blue', to: 'violet', deg: 135 }} onClick={() => { setCreateLeadDraft((d: any) => ({ ...d, creator: d.creator || me?.email || '' })); setCreateLeadOpen(true); }} leftSection={<IconPlus size={14} />}>{t.addLead}</Button>
                <Button component="a" href="/api/export.csv" variant="light" leftSection={<IconDownload size={14} />}>{t.exportCsv}</Button>
              </Group>
            </Group>

            <Collapse in={showMoreFilters}>
              <Divider my="sm" style={{ borderColor: isDark ? 'rgba(120,140,180,0.1)' : 'rgba(148,163,184,0.08)' }} />
              <Group mt="xs" mb={2} justify="space-between" wrap="wrap">
                <Group gap={10} align="end">
                  <Box w={220}>
                    <Text size="xs" c="dimmed" mb={4}>{t.minScore}: {minScore}</Text>
                    <Slider value={minScore} onChange={setMinScore} min={0} max={100} step={1} color="violet" />
                  </Box>
                  <Select w={160} data={[{ value: '0', label: 'All' }, { value: '1', label: t.lockOnly }]} value={lockedOnly ? '1' : '0'} onChange={(v) => setLockedOnly(v === '1')} />
                </Group>
                <Group gap={6}>
                  <Text size="xs" c="dimmed">{t.quickViews}</Text>
                  <Button size="compact-xs" variant="light" color="orange" onClick={() => applyQuickView('high')}>High Potential</Button>
                  <Button size="compact-xs" variant="light" color="violet" onClick={() => applyQuickView('locked')}>Locked</Button>
                  <Button size="compact-xs" variant="light" color="teal" onClick={() => applyQuickView('followup')}>Follow-up</Button>
                  <Button size="compact-xs" variant="subtle" onClick={() => applyQuickView('all')}>All</Button>
                </Group>
                <Group gap={6}>
                  <Text size="xs" c="dimmed">{t.savedViews}</Text>
                  <Select w={180} placeholder={t.savedViews} data={savedViews.map(v => ({ value: v.name, label: v.name }))} value={selectedSavedView} onChange={applySavedView} clearable />
                  <TextInput w={140} placeholder={t.viewName} value={newViewName} onChange={(e) => setNewViewName(e.currentTarget.value)} />
                  <Button size="compact-xs" variant="default" onClick={saveCurrentView}>{t.saveView}</Button>
                  <Button size="compact-xs" variant="subtle" disabled={!selectedSavedView} onClick={deleteSavedView}>{t.deleteView}</Button>
                </Group>
              </Group>
            </Collapse>
          </Box>

          {/* Status bar */}
          <Group mt="md" justify="space-between" wrap="wrap">
            <Text size="sm" c="dimmed">{t.total}: {totalRows} · {t.page}: {page}/{totalPages}{loading ? ' · loading...' : ''}</Text>
            {selectedIds.size > 0 && (
              <Group
                gap="sm"
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  background: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.06)',
                  border: `1px solid ${isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.15)'}`,
                }}
              >
                <Badge variant="gradient" gradient={{ from: 'blue', to: 'violet', deg: 135 }} size="sm">{selectedIds.size} selected</Badge>
                <Select size="xs" w={190} placeholder={t.bulkAction} data={bulkOptions} value={bulkAction} onChange={setBulkAction} clearable />
                <Button size="compact-xs" variant="gradient" gradient={{ from: 'blue', to: 'violet', deg: 135 }} disabled={!bulkAction || selectedIds.size === 0} onClick={applyBulk}>{t.apply}</Button>
              </Group>
            )}
            {selectedIds.size === 0 && (
              <Group>
                <Badge variant="light" color="gray">{t.selected}: 0</Badge>
                <Select w={190} placeholder={t.bulkAction} data={bulkOptions} value={bulkAction} onChange={setBulkAction} clearable />
                <Button size="xs" disabled={!bulkAction || selectedIds.size === 0} onClick={applyBulk}>{t.apply}</Button>
              </Group>
            )}
          </Group>

          <Divider my="sm" style={{ borderColor: isDark ? 'rgba(120,140,180,0.15)' : 'rgba(148,163,184,0.12)' }} />

          <ScrollArea type="always" offsetScrollbars>
            <Table striped highlightOnHover withTableBorder withColumnBorders miw={2100} verticalSpacing={2}>
              <Table.Thead>
                <Table.Tr style={{
                  background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.7)',
                }}>
                  <Table.Th w={46}>
                    <Checkbox checked={allChecked} onChange={(e) => {
                      const v = e.currentTarget.checked;
                      setSelectedIds(v ? new Set(rows.map(r => r.id)) : new Set());
                    }} />
                  </Table.Th>
                  <SortableHeader label="ID" k="id" w={64} sortKey={sortKey} sortDir={sortDir} onSort={setSort} thStyle={thStyle} />
                  <SortableHeader label="Name" k="name" w={160} sortKey={sortKey} sortDir={sortDir} onSort={setSort} thStyle={thStyle} />
                  <Table.Th w={160} style={thStyle}>Source</Table.Th>
                  <SortableHeader label="Score" k="score" w={88} sortKey={sortKey} sortDir={sortDir} onSort={setSort} thStyle={thStyle} />
                  <SortableHeader label="Status" k="lead_status" sortKey={sortKey} sortDir={sortDir} onSort={setSort} thStyle={thStyle} />
                  <SortableHeader label="Owner" k="owner" sortKey={sortKey} sortDir={sortDir} onSort={setSort} thStyle={thStyle} />
                  <Table.Th w={240} style={thStyle}>{t.emails}</Table.Th>
                  <Table.Th w={56} style={thStyle}>Locked</Table.Th>
                  <SortableHeader label="Vertical" k="vertical" sortKey={sortKey} sortDir={sortDir} onSort={setSort} thStyle={thStyle} />
                  <Table.Th style={thStyle}>Region</Table.Th>
                  <Table.Th style={thStyle}>City</Table.Th>
                  <SortableHeader label="CreatedAt" k="created_at" w={122} sortKey={sortKey} sortDir={sortDir} onSort={setSort} thStyle={thStyle} />
                  <SortableHeader label="UpdatedAt" k="updated_at" w={122} sortKey={sortKey} sortDir={sortDir} onSort={setSort} thStyle={thStyle} />
                  <Table.Th w={320} style={thStyle}>Action</Table.Th>
                  <Table.Th style={{ ...thStyle, width: 420, minWidth: 420, maxWidth: 420 }}>Reason</Table.Th>
                  <Table.Th style={thStyle}>{t.creator}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.length === 0 ? (
                  <Table.Tr><Table.Td colSpan={17}><Text c="dimmed" ta="center" py="xl">{loading ? t.loading : t.noData}</Text></Table.Td></Table.Tr>
                ) : rows.map((r) => {
                  const cellPad = { paddingTop: compactMode ? 6 : 10, paddingBottom: compactMode ? 6 : 10 };
                  const isSelected = selectedIds.has(r.id);
                  const isEdited = recentEditedIds.has(r.id);
                  return (
                    <Table.Tr
                      key={r.id}
                      style={{
                        ...(isEdited ? { background: 'rgba(34,197,94,0.12)' } : {}),
                        ...(isSelected ? { borderLeft: '3px solid var(--mantine-color-blue-5)' } : {}),
                        transition: 'background 220ms ease',
                      }}
                    >
                      <Table.Td style={cellPad}>
                        <Checkbox checked={isSelected} onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.currentTarget.checked) next.add(r.id); else next.delete(r.id);
                          setSelectedIds(next);
                        }} />
                      </Table.Td>
                      <Table.Td style={cellPad}>
                        <Text size="sm" c="dimmed">{r.id}</Text>
                      </Table.Td>
                      <Table.Td style={{ ...cellPad, maxWidth: 160 }}>
                        <Tooltip multiline w={480} withArrow label={r.name || '-'}>
                          <Text fw={600} size="sm" lineClamp={1} style={{ whiteSpace: 'nowrap' }}>{r.name}</Text>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td style={{ ...cellPad, maxWidth: 160 }}>
                        <Tooltip multiline w={480} withArrow label={r.source || '-'}>
                          <Text size="xs" c="dimmed" lineClamp={1} style={{ whiteSpace: 'nowrap' }}>{r.source || '-'}</Text>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td style={cellPad}>
                        {r.tidb_potential_score == null
                          ? '-'
                          : <Badge
                              variant="filled"
                              color={scoreColor(r.tidb_potential_score)}
                              size="sm"
                              style={{
                                minWidth: 36,
                                justifyContent: 'center',
                                boxShadow: `0 2px 6px rgba(0,0,0,0.15)`,
                              }}
                            >{r.tidb_potential_score}</Badge>}
                      </Table.Td>
                      <Table.Td style={cellPad}><StatusBadge s={r.lead_status} /></Table.Td>
                      <Table.Td style={cellPad}>{r.owner || '-'}</Table.Td>
                      <Table.Td style={{ ...cellPad, maxWidth: 240 }}>
                        <Tooltip multiline w={480} withArrow label={(String(r.emails || '')).split(',').join(', ') || '-'}>
                          <Text size="xs" c="dimmed" lineClamp={2}>{(String(r.emails || '')).split(',').join(', ') || '-'}</Text>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td style={cellPad}>
                        {r.manual_locked ? (
                          <Tooltip label="LOCKED" withArrow>
                            <ActionIcon variant="gradient" gradient={{ from: 'violet', to: 'grape', deg: 135 }} size="sm" radius="md">
                              <IconLock size={13} />
                            </ActionIcon>
                          </Tooltip>
                        ) : '-'}
                      </Table.Td>
                      <Table.Td style={cellPad}>{r.vertical}</Table.Td>
                      <Table.Td style={cellPad}>{r.region || '-'}</Table.Td>
                      <Table.Td style={cellPad}>{r.city || '-'}</Table.Td>
                      <Table.Td style={{ whiteSpace: 'nowrap', ...cellPad }}>{(r.created_at || '').slice(0, 10)}</Table.Td>
                      <Table.Td style={{ whiteSpace: 'nowrap', ...cellPad }}>{(r.updated_at || '').slice(0, 10)}</Table.Td>
                      <Table.Td style={{ paddingTop: compactMode ? 6 : 8, paddingBottom: compactMode ? 6 : 8 }}>
                        <Group gap={6} wrap="nowrap">
                          <Tooltip label={t.edit} withArrow>
                            <ActionIcon variant="light" color="blue" radius="md" onClick={() => setSelected({ ...r, emails: (r.emails || '').split(',').map(s => s.trim()).filter(Boolean).join('\n') } as any)}>
                              <IconEdit size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label={t.interviews} withArrow>
                            <ActionIcon variant="light" color="grape" radius="md" onClick={() => setLeadInterviewsCtx({ lead: { ...r } })}>
                              <IconNotes size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label={t.delete} withArrow>
                            <ActionIcon variant="light" color="red" radius="md" onClick={() => requestDeleteOne(r.id)}>
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ width: 420, minWidth: 420, maxWidth: 420, ...cellPad }}>
                        <Tooltip multiline w={560} withArrow label={r.tidb_potential_reason || '-'}>
                          <Text size="sm" lineClamp={1}>{r.tidb_potential_reason || ''}</Text>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td style={cellPad}><Text size="xs" c="dimmed" lineClamp={1}>{r.creator || '-'}</Text></Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          <PagePagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
            pageSizeLabel={t.pageSize}
            prevLabel={t.prev}
            nextLabel={t.next}
          />
        </GlassCard>
      </Box>
    </Tabs.Panel>
  );
}
