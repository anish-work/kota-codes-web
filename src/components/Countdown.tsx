import { useEffect, useState } from 'react';
import { EVENT } from '../content';

const START = Date.parse(EVENT.start);
const END = Date.parse(EVENT.end);
const two = (n: number) => String(n).padStart(2, '0');

function read(now: number) {
  const ms = START - now;
  if (ms <= 0) {
    return { label: now < END ? 'happening-now/' : 'thanks-for-coming/', value: 'see you at the next one' };
  }
  const s = Math.floor(ms / 1000);
  return {
    label: 'meetup-starts-in/',
    value: [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map(two).join(' : '),
  };
}

// Prerendered with a placeholder so server and client markup match; ticks after hydration.
export function Countdown() {
  const [state, setState] = useState<ReturnType<typeof read> | null>(null);

  useEffect(() => {
    const tick = () => setState(read(Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bar">
      <div className="in">
        <span>{state?.label ?? 'meetup-starts-in/'}</span>
        <span className="num" role="timer" aria-live="off">
          {state?.value ?? '--  :  --  :  --  :  --'}
        </span>
      </div>
    </div>
  );
}
