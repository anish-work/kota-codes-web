import { useEffect, useRef } from 'react';

// Scale a headline so it exactly fills its cell's width, up to `max` px. CSS gives a close vw fallback before JS runs.
export function useFitText<T extends HTMLElement>(max: number) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const box = el.parentElement!;
      const cs = getComputedStyle(box);
      const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      el.style.fontSize = '100px';
      const w = el.getBoundingClientRect().width;
      if (w > 0) el.style.fontSize = `${Math.min(max, Math.floor(((100 * avail) / w) * 0.995))}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [max]);
  return ref;
}
