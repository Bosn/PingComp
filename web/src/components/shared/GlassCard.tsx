import { Paper, type PaperProps } from '@mantine/core';
import { useThemeStyles } from '../../hooks/useThemeStyles';

type GlassCardProps = PaperProps & { children: React.ReactNode };

export function GlassCard({ children, style, ...props }: GlassCardProps) {
  const { isDark } = useThemeStyles();
  return (
    <Paper
      withBorder
      p="md"
      radius="lg"
      style={{
        background: isDark
          ? 'rgba(15,23,42,0.55)'
          : 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderColor: isDark
          ? 'rgba(120,140,180,0.25)'
          : 'rgba(148,163,184,0.2)',
        boxShadow: isDark
          ? '0 0 0 1px rgba(96,165,250,0.08), 0 8px 32px rgba(0,0,0,0.35)'
          : '0 0 0 1px rgba(59,130,246,0.05), 0 8px 24px rgba(30,64,175,0.06)',
        ...style as any,
      }}
      {...props}
    >
      {children}
    </Paper>
  );
}
