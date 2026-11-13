import { SPEAKERS } from '../content';
import { SectionHead } from './SectionHead';

// The two talks at Meetup 01: photo beside the talk's title, time and speaker.
export function Speakers() {
  return (
    <section aria-labelledby="speakers-h">
      <SectionHead id="speakers" title="speakers/" />
      <div className="band">
        <div className="frame cells talks">
          {SPEAKERS.map((s) => (
            <article className="talk" key={s.name}>
              <div className="portrait" aria-hidden="true">
                <img src={s.photo} alt="" loading="lazy" decoding="async" />
              </div>
              <div className="pad talk-text">
                <p className="mono">{s.time} / talk</p>
                <h3>“{s.talk}”</h3>
                <p className="by">
                  {s.name}
                  <span>
                    {s.role}, {s.org}
                  </span>
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
