export const messages = {
  zh: {
    appTitle: 'PingComp',
    subtitle: '潜在客户人工清洗与标注 · MySQL as Source of Truth',
    dashboard: 'Dashboard',
    leads: 'Leads',
    enrich: 'Enrich',
    activity: 'Activity',
    exportCenter: 'Export Center',
    exportCsv: '导出 CSV',
    filter: '筛选',
    reset: '重置',
    lockedOnly: '仅锁定',
    prev: '上一页',
    next: '下一页',
    edit: '编辑',
    unlock: '解锁'
  },
  en: {
    appTitle: 'PingComp',
    subtitle: 'Lead ops workspace · MySQL as Source of Truth',
    dashboard: 'Dashboard',
    leads: 'Leads',
    enrich: 'Enrich',
    activity: 'Activity',
    exportCenter: 'Export Center',
    exportCsv: 'Export CSV',
    filter: 'Filter',
    reset: 'Reset',
    lockedOnly: 'Locked only',
    prev: 'Prev',
    next: 'Next',
    edit: 'Edit',
    unlock: 'Unlock'
  }
} as const;

export type Lang = 'zh' | 'en';

export function pickLang(input: string | undefined): Lang {
  return input === 'en' ? 'en' : 'zh';
}
