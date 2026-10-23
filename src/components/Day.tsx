import { EVENT, SCHEDULE } from '../content';
import { Pixel } from './Pixel';
import { SectionHead } from './SectionHead';

// "10:55 am" -> "10:55" (or "2026-11-08T10:55:00+05:30" once the date is set), a machine-readable time.
function toIso(label: string) {
  const [, h, m, ap] = label.match(/(\d+):(\d+)\s*(am|pm)/i)!;
  const hhmm = `${String((Number(h) % 12) + (ap.toLowerCase() === 'pm' ? 12 : 0)).padStart(2, '0')}:${m}`;
  return EVENT.start ? `${EVENT.start.slice(0, 10)}T${hhmm}:00+05:30` : hhmm;
}

export function Day() {
  return (
    <section aria-labelledby="day-h">
      <SectionHead id="day" title="the-day/" aside={<Pixel name="chhatri" />} />
      <div className="band">
        <div className="frame cells day">
          <div className="pad side">
            <p className="when">
              Coming soon,
              <br />
              around Diwali
            </p>
            <p className="mono">date and time to be announced</p>
            <p>A three-hour morning, with snacks and coffee. The plan below may shift a little once the date is fixed.</p>
          </div>
          <div>
            {SCHEDULE.map(({ part, slots }) => (
              <div className="part" key={part}>
                <h3>{part}</h3>
                <ol className="slots">
                  {slots.map((s) => (
                    <li key={s.time} className={s.pix ? 'with-pix' : undefined}>
                      <div>
                        <time dateTime={toIso(s.time)}>{s.time}</time>
                        <strong>{s.title}</strong>
                        {s.note && <p>{s.note}</p>}
                      </div>
                      {s.pix && <Pixel name={s.pix} />}
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
