export const brandGradient = 'linear-gradient(135deg, #3B82F6, #8B5CF6, #06B6D4)';

export const glassSurface = {
  dark: {
    bg: 'rgba(15,23,42,0.72)',
    filter: 'blur(16px) saturate(180%)',
  },
  light: {
    bg: 'rgba(255,255,255,0.82)',
    filter: 'blur(16px) saturate(180%)',
  },
};

export const scoreColor = (v: number) => (v >= 75 ? 'green' : v >= 50 ? 'yellow' : 'red');

export const STATUS_BADGE: Record<string, { color: string }> = {
  new: { color: 'blue' },
  contacted: { color: 'orange' },
  qualified: { color: 'green' },
  disqualified: { color: 'red' },
};

export const ENRICH_STATUS_COLOR: Record<string, string> = {
  pending: 'yellow',
  running: 'blue',
  done: 'green',
  failed: 'red',
};
