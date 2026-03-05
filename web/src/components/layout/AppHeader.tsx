import {
  ActionIcon, Avatar, Badge, Box, Group, Menu, Paper, Stack, Text, Title,
} from '@mantine/core';
import { IconMoonStars, IconSun, IconWorld } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import type { Lang } from '../../types';
import type { I18NStrings } from '../../i18n';

type AppHeaderProps = {
  t: I18NStrings;
  lang: Lang;
  setLang: (v: Lang) => void;
  me: { name?: string; email?: string; picture?: string } | null;
};

export function AppHeader({ t, lang, setLang, me }: AppHeaderProps) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { computedColorScheme, isDark } = useThemeStyles();

  return (
    <Paper
      withBorder
      p="md"
      radius={0}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        backdropFilter: 'blur(20px) saturate(180%)',
        background: isDark
          ? 'rgba(15,23,42,0.65)'
          : 'rgba(255,255,255,0.75)',
        boxShadow: isDark
          ? '0 4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(59,130,246,0.06) inset'
          : '0 4px 20px rgba(0,0,0,0.06), 0 0 40px rgba(59,130,246,0.04) inset',
        borderColor: isDark ? 'rgba(120,140,180,0.3)' : 'rgba(148,163,184,0.25)',
        borderBottom: 'none',
      }}
    >
      {/* Animated gradient overlay */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background: isDark
            ? 'linear-gradient(120deg, rgba(59,130,246,0.22), rgba(139,92,246,0.18), rgba(6,182,212,0.14), rgba(59,130,246,0.22))'
            : 'linear-gradient(120deg, rgba(59,130,246,0.14), rgba(139,92,246,0.11), rgba(6,182,212,0.09), rgba(59,130,246,0.14))',
          backgroundSize: '280% 280%',
          animation: 'pcBannerGradientDrift 30s ease-in-out infinite',
          willChange: 'background-position, opacity',
          pointerEvents: 'none',
        }}
      />
      <Group justify="space-between" align="center" style={{ position: 'relative' }}>
        <Group gap={12}>
          {/* Logo with gradient glow */}
          <Box
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(139,92,246,0.35), rgba(6,182,212,0.3))',
              border: '1px solid rgba(139,146,210,0.4)',
              boxShadow: '0 4px 16px rgba(59,130,246,0.2)',
            }}
          >
            <img src="/logo.svg" alt="PingComp" width={30} height={30} />
          </Box>
          <Stack gap={0}>
            <Group gap={8} align="center">
              <Title
                order={2}
                fw={900}
                style={{
                  letterSpacing: -0.3,
                  background: 'linear-gradient(135deg, #3B82F6, #8B5CF6, #06B6D4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {t.title}
              </Title>
              <Badge
                size="xs"
                variant="gradient"
                gradient={{ from: 'blue', to: 'violet', deg: 135 }}
                style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                AI
              </Badge>
            </Group>
            <Text size="sm" c="dimmed" fw={500}>{t.subtitle}</Text>
          </Stack>
        </Group>
        <Group gap={8}>
          <Menu shadow="lg" width={150} position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="language"><IconWorld size={17} /></ActionIcon>
            </Menu.Target>
            <Menu.Dropdown style={{ backdropFilter: 'blur(12px)' }}>
              <Menu.Item onClick={() => setLang('zh')}>中文</Menu.Item>
              <Menu.Item onClick={() => setLang('en')}>English</Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Menu shadow="lg" width={180} position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="theme">
                {computedColorScheme === 'light' ? <IconSun size={17} /> : <IconMoonStars size={17} />}
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown style={{ backdropFilter: 'blur(12px)' }}>
              <Menu.Item leftSection={<IconSun size={14} />} onClick={() => setColorScheme('light')}>Light</Menu.Item>
              <Menu.Item leftSection={<IconMoonStars size={14} />} onClick={() => setColorScheme('dark')}>Dark</Menu.Item>
              <Menu.Item leftSection={<IconWorld size={14} />} onClick={() => setColorScheme('auto')}>System</Menu.Item>
            </Menu.Dropdown>
          </Menu>
          {me ? (
            <Menu shadow="lg" width={200} position="bottom-end">
              <Menu.Target>
                <Group gap={8} style={{ cursor: 'pointer' }}>
                  <Avatar
                    src={me.picture}
                    size={32}
                    radius="xl"
                    style={{
                      border: '2px solid rgba(139,92,246,0.4)',
                      boxShadow: '0 0 12px rgba(139,92,246,0.15)',
                    }}
                  />
                  <Text size="sm" c="dimmed" style={{ maxWidth: 140 }} lineClamp={1}>{me.name || me.email}</Text>
                </Group>
              </Menu.Target>
              <Menu.Dropdown style={{ backdropFilter: 'blur(12px)' }}>
                <Menu.Label>{me.email}</Menu.Label>
                <Menu.Divider />
                <Menu.Item component="a" href="/logout" color="red">{t.logout}</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : null}
        </Group>
      </Group>
    </Paper>
  );
}
