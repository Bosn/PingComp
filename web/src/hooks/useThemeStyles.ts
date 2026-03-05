import { useComputedColorScheme } from '@mantine/core';

export function useThemeStyles() {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: false });
  const isDark = computedColorScheme === 'dark';

  return {
    isDark,
    computedColorScheme,
    border: isDark ? 'rgba(120,140,180,0.35)' : 'rgba(130,150,190,0.22)',
    panelBg: isDark
      ? 'linear-gradient(180deg, rgba(15,23,42,0.62), rgba(17,24,39,0.58))'
      : 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,252,0.92))',
    tabBg: isDark ? 'rgba(51,65,85,0.35)' : 'rgba(226,232,240,0.7)',
    tabActive: isDark ? 'rgba(59,130,246,0.24)' : 'rgba(37,99,235,0.12)',
    cardGlow: isDark
      ? '0 0 0 1px rgba(96,165,250,0.12), 0 10px 30px rgba(2,6,23,0.45)'
      : '0 0 0 1px rgba(59,130,246,0.08), 0 8px 24px rgba(30,64,175,0.08)',
    glassCard: {
      borderColor: isDark ? 'rgba(120,140,180,0.35)' : 'rgba(130,150,190,0.22)',
      background: isDark
        ? 'linear-gradient(180deg, rgba(15,23,42,0.62), rgba(17,24,39,0.58))'
        : 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,252,0.92))',
      boxShadow: isDark
        ? '0 0 0 1px rgba(96,165,250,0.12), 0 10px 30px rgba(2,6,23,0.45)'
        : '0 0 0 1px rgba(59,130,246,0.08), 0 8px 24px rgba(30,64,175,0.08)',
      backdropFilter: 'blur(16px) saturate(180%)',
    },
    thStyle: {
      background: isDark ? 'rgba(18,24,39,0.95)' : 'rgba(239,246,255,0.95)',
      color: isDark ? '#dbe7ff' : '#1e293b',
      borderBottom: isDark ? '1px solid rgba(120,140,180,0.45)' : '1px solid rgba(148,163,184,0.38)',
    } as React.CSSProperties,
    headerGradient: isDark
      ? 'linear-gradient(120deg, rgba(59,130,246,0.12), rgba(139,92,246,0.1), rgba(16,185,129,0.08))'
      : 'linear-gradient(120deg, rgba(59,130,246,0.08), rgba(139,92,246,0.07), rgba(16,185,129,0.06))',
    logoBg: isDark
      ? 'linear-gradient(160deg, rgba(37,99,235,0.45), rgba(76,29,149,0.35))'
      : 'linear-gradient(160deg, rgba(37,99,235,0.28), rgba(76,29,149,0.2))',
  };
}
