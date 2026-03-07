import { Tabs } from '@mantine/core';
import { IconMessageCircle, IconBrain, IconActivity, IconNotes, IconBolt, IconGauge, IconReportAnalytics } from '@tabler/icons-react';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import type { I18NStrings } from '../../i18n';

type TabNavigationProps = {
  tab: string | null;
  setTab: (v: string | null) => void;
  t: I18NStrings;
  children: React.ReactNode;
};

export function TabNavigation({ tab, setTab, t, children }: TabNavigationProps) {
  const { isDark, border } = useThemeStyles();

  return (
    <Tabs value={tab} onChange={setTab} radius={0}>
      <Tabs.List
        className="pc-tab-list"
        style={{
          borderRadius: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          padding: 6,
          background: isDark
            ? 'rgba(30,41,59,0.5)'
            : 'rgba(241,245,249,0.8)',
          border: `1px solid ${border}`,
          borderTop: 'none',
          borderBottom: 'none',
          backdropFilter: 'blur(12px)',
          gap: 4,
        }}
      >
        <Tabs.Tab value="brief" leftSection={<IconReportAnalytics size={15} />} style={{ borderRadius: 0, fontWeight: 600 }} color="blue">{t.brief}</Tabs.Tab>
        <Tabs.Tab value="agent" leftSection={<IconMessageCircle size={15} />} style={{ borderRadius: 0, fontWeight: 600 }} color="blue">{t.agent}</Tabs.Tab>
        <Tabs.Tab value="leads" leftSection={<IconBrain size={15} />} style={{ borderRadius: 0, fontWeight: 600 }} color="blue">{t.leads}</Tabs.Tab>
        <Tabs.Tab value="outreach" leftSection={<IconActivity size={15} />} style={{ borderRadius: 0, fontWeight: 600 }} color="blue">{t.outreach}</Tabs.Tab>
        <Tabs.Tab value="interviews" leftSection={<IconNotes size={15} />} style={{ borderRadius: 0, fontWeight: 600 }} color="blue">{t.interviews}</Tabs.Tab>
        <Tabs.Tab value="enrich" leftSection={<IconBolt size={15} />} style={{ borderRadius: 0, fontWeight: 600 }} color="blue">{t.enrich}</Tabs.Tab>
        <Tabs.Tab value="dashboard" leftSection={<IconGauge size={15} />} style={{ borderRadius: 0, fontWeight: 600 }} color="blue">{t.dashboard}</Tabs.Tab>
      </Tabs.List>
      {children}
    </Tabs>
  );
}
