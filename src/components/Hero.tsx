import { SITE } from '../content';
import { useFitText } from '../fit';
import { Arrow } from './Arrow';
import { Lockup } from './Logo';
import { Pixel } from './Pixel';

// The home page opens with the wordmark, filling the frame, over the Kota skyline.
export function Hero() {
  const markRef = useFitText<HTMLParagraphElement>(240);
  return (
    <>
      <section className="band" aria-label={SITE.name}>
        <div className="frame">
          <div className="mark-cell">
            <p className="mark wordmark" ref={markRef}>
              <Lockup />
            </p>
          </div>
          <div className="hero-sky">
            <div className="sky-track">
              <Pixel name="skyline" />
              <Pixel name="skyline" className="sky-loop" />
            </div>
          </div>
        </div>
      </section>
      <div className="band">
        <div className="frame cells hero-lower">
          <div className="pad meta-cell">
            <p className="meta-row mono">
              <span>kota, rajasthan</span>
              <span>{SITE.handle}</span>
            </p>
            <div className="venue-line">
              <h1 className="slash-big">{SITE.tagline}</h1>
              <a className="ghost" href="/meetup-01">
                How Meetup 01 went <Arrow />
              </a>
            </div>
          </div>
          <div className="pad say">
            <p className="motto">{SITE.motto}</p>
            <p>A community for anyone in Kota who is curious about AI and technology. You don’t need to know coding.</p>
          </div>
        </div>
      </div>
    </>
  );
}
