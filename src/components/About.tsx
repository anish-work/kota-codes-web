import { WeaveMark } from './Logo';
import { SectionHead } from './SectionHead';

const FACTS = [
  ['#01', 'the first meetup in kota'],
  ['free', 'entry, snacks and coffee'],
  ['0', 'coding needed'],
];

// The woven mark with where it comes from, beside the meetup in three numbers.
function Mosaic() {
  return (
    <div className="mosaic">
      <figure className="mosaic-mark">
        <WeaveMark label="The Kota Codes mark: a K woven into Kota Doria checks" />
        <figcaption>a k woven into kota doria checks, the light cloth woven in kaithoon, next to kota.</figcaption>
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
              Kota is full of talented people, but there’s no place where they can meet, learn together and share what
              they know about technology. Kota Codes is a new community to change that.
            </p>
            <p>
              This is our very first meetup. It should feel like a relaxed morning with coffee, good conversations and a few
              “oh, so that’s how it works” moments.
            </p>
          </div>
          <Mosaic />
        </div>
      </div>
    </section>
  );
}
