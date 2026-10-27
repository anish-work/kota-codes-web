import { SPEAKERS } from '../content';
import { SectionHead } from './SectionHead';

export function Speakers() {
  return (
    <section aria-labelledby="speakers-h">
      <SectionHead id="speakers" title="speakers/" />
      <div className="band">
        <div className="frame cells people">
          {SPEAKERS.map((s) => (
            <figure className="person" key={s.name}>
              <div className="portrait" aria-hidden="true">
                {s.photo ? <img src={s.photo} alt="" loading="lazy" decoding="async" /> : <span>{s.name[0]}</span>}
              </div>
              <figcaption>
                {s.name}, {s.org}
                <em>
                  {s.role} · {s.topic}
                </em>
              </figcaption>
            </figure>
          ))}
          <figure className="person">
            <div className="portrait text-only">
              <span>People from Kota share their own stories</span>
            </div>
            <figcaption>
              Kota stories<em>12:35 pm on the day</em>
            </figcaption>
          </figure>
          <figure className="person">
            <div className="portrait text-only">
              <span>More speakers to be announced</span>
            </div>
            <figcaption>
              Follow @kota.codes<em>for updates</em>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
