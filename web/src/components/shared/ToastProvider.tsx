import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActionIcon, Group, Paper, Portal, Progress, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';

type ToastTone = 'error' | 'success' | 'info';

type ToastInput = {
  title?: string;
  message: string;
  tone?: ToastTone;
  autoClose?: number;
};

type ToastItem = ToastInput & {
  id: number;
  tone: ToastTone;
  autoClose: number;
};

const ToastContext = createContext<{ showToast: (toast: ToastInput) => void } | null>(null);

function getToastToneStyles(tone: ToastTone) {
  if (tone === 'error') {
    return {
      color: '#ef4444',
      icon: IconAlertCircle,
      borderColor: 'rgba(239, 68, 68, 0.28)',
      background: 'linear-gradient(180deg, rgba(38, 12, 15, 0.96), rgba(24, 8, 10, 0.94))',
      glow: '0 20px 45px rgba(127, 29, 29, 0.28)',
      progress: 'linear-gradient(90deg, #ef4444, #fb7185)',
    };
  }

  if (tone === 'success') {
    return {
      color: '#10b981',
      icon: IconCheck,
      borderColor: 'rgba(16, 185, 129, 0.28)',
      background: 'linear-gradient(180deg, rgba(9, 33, 28, 0.96), rgba(7, 24, 20, 0.94))',
      glow: '0 20px 45px rgba(6, 95, 70, 0.22)',
      progress: 'linear-gradient(90deg, #10b981, #34d399)',
    };
  }

  return {
    color: '#60a5fa',
    icon: IconInfoCircle,
    borderColor: 'rgba(96, 165, 250, 0.28)',
    background: 'linear-gradient(180deg, rgba(11, 24, 44, 0.96), rgba(8, 17, 32, 0.94))',
    glow: '0 20px 45px rgba(30, 64, 175, 0.22)',
    progress: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef(new Map<number, number>());
  const nextIdRef = useRef(1);

  const removeToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = nextIdRef.current++;
    const autoClose = Math.max(1800, toast.autoClose ?? 4200);
    const item: ToastItem = {
      id,
      title: toast.title,
      message: toast.message,
      tone: toast.tone ?? 'info',
      autoClose,
    };

    setItems(prev => {
      const next = [item, ...prev];
      const removed = next.slice(4);
      for (const dropped of removed) {
        const timer = timersRef.current.get(dropped.id);
        if (timer) {
          window.clearTimeout(timer);
          timersRef.current.delete(dropped.id);
        }
      }
      return next.slice(0, 4);
    });
    timersRef.current.set(id, window.setTimeout(() => removeToast(id), autoClose));
  }, [removeToast]);

  useEffect(() => () => {
    timersRef.current.forEach(timer => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <Portal>
        <div className="pc-toast-stack">
          <Stack gap="sm">
            {items.map(item => {
              const tone = getToastToneStyles(item.tone);
              const Icon = tone.icon;

              return (
                <Paper
                  key={item.id}
                  className="pc-toast"
                  radius="xl"
                  p="sm"
                  style={{
                    border: `1px solid ${tone.borderColor}`,
                    background: tone.background,
                    boxShadow: `${tone.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                    backdropFilter: 'blur(18px) saturate(150%)',
                    overflow: 'hidden',
                  }}
                >
                  <Group align="flex-start" gap="sm" wrap="nowrap">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        display: 'grid',
                        placeItems: 'center',
                        color: tone.color,
                        background: 'rgba(255,255,255,0.06)',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
                        flex: '0 0 auto',
                      }}
                    >
                      <Icon size={18} stroke={1.9} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {item.title ? <Text fw={700} c="white" size="sm">{item.title}</Text> : null}
                      <Text size="sm" c="rgba(255,255,255,0.82)" style={{ lineHeight: 1.5 }}>
                        {item.message}
                      </Text>
                    </div>

                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      radius="xl"
                      aria-label="Close notification"
                      onClick={() => removeToast(item.id)}
                      style={{ color: 'rgba(255,255,255,0.68)' }}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>

                  <Progress
                    value={100}
                    size={4}
                    mt="sm"
                    radius="xl"
                    animated
                    styles={{
                      root: { background: 'rgba(255,255,255,0.08)' },
                      section: { backgroundImage: tone.progress },
                    }}
                  />
                </Paper>
              );
            })}
          </Stack>
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
