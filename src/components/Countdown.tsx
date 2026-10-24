import { useEffect, useState } from 'react';
import { EVENT } from '../content';

const two = (n: number) => String(n).padStart(2, '0');

function read(now: number, start: number, end: number) {
  const ms = start - now;
  if (ms <= 0) {
    return { label: now < end ? 'happening-now/' : 'thanks-for-coming/', value: 'see you at the next one' };
  }
  const s = Math.floor(ms / 1000);
  return {
    label: 'meetup-starts-in/',
    value: [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map(two).join(' : '),
  };
}

function Bar({ label, value }: { label: string; value: string }) {
  return (
    <div className="bar">
      <div className="in">
        <span>{label}</span>
        <span className="num" role="timer" aria-live="off">
          {value}
        </span>
      </div>
    </div>
  );
}

// Until the date is fixed, the bar just says when to expect it.
export function Countdown() {
  return EVENT.start && EVENT.end ? (
    <Ticking start={Date.parse(EVENT.start)} end={Date.parse(EVENT.end)} />
  ) : (
    <Bar label="meetup-date/" value={EVENT.when} />
  );
}

// Prerendered with a placeholder so server and client markup match; ticks after hydration.
function Ticking({ start, end }: { start: number; end: number }) {
  const [state, setState] = useState<ReturnType<typeof read> | null>(null);

  useEffect(() => {
    const tick = () => setState(read(Date.now(), start, end));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [start, end]);

  return <Bar label={state?.label ?? 'meetup-starts-in/'} value={state?.value ?? '--  :  --  :  --  :  --'} />;
}
