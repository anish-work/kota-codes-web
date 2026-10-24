import { useEffect, useRef } from 'react';
import { EVENT } from '../content';
import { Arrow } from './Arrow';
import { Pixel } from './Pixel';

// Scale the headline so its longest line exactly fills the cell. CSS gives a close vw fallback before JS runs.
function useFitText() {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const mark = ref.current;
    if (!mark) return;
    const fit = () => {
      const box = mark.parentElement!;
      const cs = getComputedStyle(box);
      const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      mark.style.fontSize = '100px';
      const w = mark.getBoundingClientRect().width;
      if (w > 0) mark.style.fontSize = `${Math.min(230, Math.floor(((100 * avail) / w) * 0.995))}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return ref;
}

export function Hero() {
  const markRef = useFitText();
  return (
    <>
      <section className="band" aria-label={EVENT.name}>
        <div className="frame">
          <div className="mark-cell">
            <h1 className="mark" ref={markRef}>
              <span>Kota’s first</span> <span>AI &amp; tech meetup<span className="sq" aria-hidden="true"></span></span>
            </h1>
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
              <span>{EVENT.when}</span>
              <span>kota, rajasthan / free entry</span>
            </p>
            <p className="slash-big">{EVENT.venue ? `${EVENT.venue}/` : 'venue-coming-soon/'}</p>
          </div>
          <div className="intro-cell cells">
            <div className="pad say">
              <p>{EVENT.description}</p>
            </div>
            <div className="pad">
              <a className="btn big nudge" href="/register">
                Save your seat <Arrow />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
