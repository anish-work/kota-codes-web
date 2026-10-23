import { EVENT, SCHEDULE } from '../content';
import { SectionHead } from './SectionHead';

// "10:55 am" -> "2026-11-01T10:55:00+05:30", so each slot carries a machine-readable time.
function toIso(label: string) {
  const [, h, m, ap] = label.match(/(\d+):(\d+)\s*(am|pm)/i)!;
  const hour = (Number(h) % 12) + (ap.toLowerCase() === 'pm' ? 12 : 0);
  return `${EVENT.start.slice(0, 10)}T${String(hour).padStart(2, '0')}:${m}:00+05:30`;
}

export function Day() {
  return (
    <section aria-labelledby="day-h">
      <SectionHead id="day" title="the-day/" />
      <div className="band">
        <div className="frame cells day">
          <div className="pad side">
            <p className="when">
              Sunday,
              <br />1 November
            </p>
            <p className="mono">{EVENT.timeLabel}</p>
            <p>Three hours, from chai to lunch. Times may shift by a few minutes on the day.</p>
          </div>
          <div>
            {SCHEDULE.map(({ part, slots }) => (
              <div className="part" key={part}>
                <h3>{part}</h3>
                <ol className="slots">
                  {slots.map((s) => (
                    <li key={s.time}>
                      <time dateTime={toIso(s.time)}>{s.time}</time>
                      <strong>{s.title}</strong>
                      {s.note && <p>{s.note}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
