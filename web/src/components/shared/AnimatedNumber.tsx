import { useEffect, useRef, useState } from 'react';
import { Title, type TitleProps } from '@mantine/core';

type AnimatedNumberProps = Omit<TitleProps, 'children'> & {
  value: number | string;
  suffix?: string;
};

export function AnimatedNumber({ value, suffix = '', ...props }: AnimatedNumberProps) {
  const numVal = typeof value === 'number' ? value : parseFloat(value);
  const [display, setDisplay] = useState(isNaN(numVal) ? value : 0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (isNaN(numVal)) {
      setDisplay(value);
      return;
    }
    const duration = 400;
    const startVal = typeof display === 'number' ? display : 0;
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (numVal - startVal) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [numVal]);

  return <Title {...props}>{display}{suffix}</Title>;
}
