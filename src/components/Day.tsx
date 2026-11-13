import { MEETUP_01, SCHEDULE } from '../content';
import { Pixel } from './Pixel';
import { SectionHead } from './SectionHead';

// "10:55 am" -> "2026-11-07T10:55:00+05:30", a machine-readable time on the day.
function toIso(label: string) {
  const [, h, m, ap] = label.match(/(\d+):(\d+)\s*(am|pm)/i)!;
  const hh = String((Number(h) % 12) + (ap.toLowerCase() === 'pm' ? 12 : 0)).padStart(2, '0');
  return `${MEETUP_01.start.slice(0, 10)}T${hh}:${m}:00+05:30`;
}

export function Day() {
  return (
    <section aria-labelledby="the-day-h">
      <SectionHead id="the-day" title="the-day/" aside={<Pixel name="chhatri" />} />
      <div className="band">
        <div className="frame cells day">
          <div className="pad side">
            <p className="when">
              {MEETUP_01.day[0]}
              <br />
              {MEETUP_01.day[1]}
            </p>
            <p className="mono">{MEETUP_01.time}</p>
            <p>A three-hour morning at {MEETUP_01.where}, with snacks and coffee.</p>
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
