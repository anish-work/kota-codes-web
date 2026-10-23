import { SWATCH_SIZE, SWATCH_SVG } from '../weave';
import { WeaveMark } from './Logo';
import { SectionHead } from './SectionHead';

// A swatch of Kota Doria cloth beside the woven mark.
function Mosaic() {
  return (
    <div className="mosaic">
      <svg
        className="lg"
        viewBox={`0 0 ${SWATCH_SIZE} ${SWATCH_SIZE}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: SWATCH_SVG }}
      />
      <div className="mosaic-mark">
        <WeaveMark label="The Kota Codes mark: a K woven into Kota Doria checks" />
      </div>
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
              This is our very first meetup. It should feel like a relaxed morning with chai, good conversations and a few
              “oh, so that’s how it works” moments.
            </p>
          </div>
          <Mosaic />
        </div>
      </div>
    </section>
  );
}
