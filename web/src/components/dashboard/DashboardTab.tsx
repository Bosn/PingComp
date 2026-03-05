import { Tabs, Box, SimpleGrid, Card, Group, Text, Title, ThemeIcon } from '@mantine/core';
import { IconUsers, IconLock, IconGauge, IconPercentage, IconActivity, IconBolt } from '@tabler/icons-react';
import { TrendSparkline, HorizontalBars } from '../charts';
import { AnimatedNumber, GlassCard } from '../shared';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import type { DashboardPayload } from '../../types';
import type { I18NStrings } from '../../i18n';

const KPI_ACCENTS = [
  'linear-gradient(90deg, #3B82F6, #60A5FA)',
  'linear-gradient(90deg, #8B5CF6, #A78BFA)',
  'linear-gradient(90deg, #14B8A6, #2DD4BF)',
  'linear-gradient(90deg, #F59E0B, #FBBF24)',
];

type KpiCardProps = {
  label: string;
  value: number | string;
  suffix?: string;
  color: string;
  icon: React.ReactNode;
  accentIndex: number;
  isDark: boolean;
};

function KpiCard({ label, value, suffix, color, icon, accentIndex, isDark }: KpiCardProps) {
  return (
    <Card
      withBorder
      radius="lg"
      p="lg"
      className="pc-kpi-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(16px) saturate(180%)',
        borderColor: isDark ? 'rgba(120,140,180,0.2)' : 'rgba(148,163,184,0.18)',
        ['--kpi-accent' as any]: KPI_ACCENTS[accentIndex],
        boxShadow: isDark
          ? `0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(96,165,250,0.06)`
          : `0 4px 16px rgba(0,0,0,0.04), 0 0 0 1px rgba(59,130,246,0.04)`,
      }}
    >
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed" fw={600} style={{ letterSpacing: 0.2 }}>{label}</Text>
        <ThemeIcon variant="light" color={color} size="xl" radius="lg" style={{ boxShadow: `0 2px 8px rgba(0,0,0,0.1)` }}>
          {icon}
        </ThemeIcon>
      </Group>
      <AnimatedNumber order={2} fw={800} value={typeof value === 'string' ? value : value} suffix={suffix} />
    </Card>
  );
}

type Props = {
  dash: DashboardPayload | null;
  t: I18NStrings;
};

export function DashboardTab({ dash, t }: Props) {
  const { isDark } = useThemeStyles();

  return (
    <Tabs.Panel value="dashboard" pt="md">
      <Box px="md" className="pc-slide-up">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <KpiCard label={t.total} value={dash?.total ?? 0} color="blue" icon={<IconUsers size={20} />} accentIndex={0} isDark={isDark} />
          <KpiCard label={t.locked} value={dash?.locked ?? 0} color="violet" icon={<IconLock size={20} />} accentIndex={1} isDark={isDark} />
          <KpiCard label={t.avg} value={dash?.avgScore ?? 0} color="teal" icon={<IconGauge size={20} />} accentIndex={2} isDark={isDark} />
          <KpiCard label={t.lockRate} value={dash?.total ? Math.round((dash.locked / dash.total) * 100) : 0} suffix="%" color="orange" icon={<IconPercentage size={20} />} accentIndex={3} isDark={isDark} />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mt="md">
          <GlassCard p="lg">
            <Group gap={8} mb="sm">
              <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 135 }} size="md" radius="md"><IconActivity size={14} /></ThemeIcon>
              <Title order={5}>{t.trend7d}</Title>
            </Group>
            <TrendSparkline data={dash?.dailyTrend || []} />
            <Text size="xs" c="dimmed" mt={6}>{(dash?.dailyTrend || []).map(x => `${x.d.slice(5)}:${x.c}`).join(' · ')}</Text>
          </GlassCard>
          <GlassCard p="lg">
            <Group gap={8} mb="sm">
              <ThemeIcon variant="gradient" gradient={{ from: 'teal', to: 'green', deg: 135 }} size="md" radius="md"><IconGauge size={14} /></ThemeIcon>
              <Title order={5}>{t.scoreDist}</Title>
            </Group>
            <HorizontalBars rows={(dash?.scoreBuckets || []).map(x => ({ k: x.bucket, v: x.c }))} />
          </GlassCard>
          <GlassCard p="lg">
            <Group gap={8} mb="sm">
              <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'grape', deg: 135 }} size="md" radius="md"><IconBolt size={14} /></ThemeIcon>
              <Title order={5}>{t.enrichDist}</Title>
            </Group>
            <HorizontalBars rows={(dash?.enrichRows || []).map(x => ({ k: x.enrich_status || 'unknown', v: x.c }))} />
          </GlassCard>
        </SimpleGrid>
      </Box>
    </Tabs.Panel>
  );
}
