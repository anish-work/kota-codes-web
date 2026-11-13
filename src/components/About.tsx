import { FACTS } from '../content';
import { WeaveMark } from './Logo';
import { SectionHead } from './SectionHead';

// The woven mark with where it comes from, beside the community in three numbers.
function Mosaic() {
  return (
    <div className="mosaic">
      <figure className="mosaic-mark">
        <WeaveMark label="The Kota Codes mark: a K woven into Kota Doria checks" />
        <figcaption>A “k” woven in kota doria checks, the light cloth woven in kaithoon, next to kota.</figcaption>
      </figure>
      <dl className="facts">
        {FACTS.map(([n, label]) => (
          <div key={n}>
            <dt>{n}</dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function About() {
  return (
    <section aria-labelledby="about-h">
      <SectionHead id="about" title="about/" />
      <div className="band">
        <div className="frame cells about">
          <div className="pad text">
            <p>
              Kota is full of talented people, but there was no open place to learn tech together. Kota Codes started to
              change that.
            </p>
            <p>
              Meetup 01 was the first step. Now we’re a community: people in Kota who meet, learn from each other and share
              what they know about AI and technology.
            </p>
          </div>
          <Mosaic />
        </div>
      </div>
    </section>
  );
}
