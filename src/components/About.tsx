import { SectionHead } from './SectionHead';

// Pixel mosaic: a checker panel and the three-slab logo, drawn as square pixels.
const COLORS: Record<string, string> = { g: '#2E7A3C', l: '#C8F169', f: '#0F3D2E', m: '#6CC08F', e: '#3E9A5A' };
const PANELS = [
  ['glggglgg', 'gglgggll', 'lgggllgg', 'gglggglg', 'lgglgggl'],
  ['ffffffff', 'fffllllf', 'ffmmmmff', 'feeeefff', 'ffffffff'],
];

function Mosaic() {
  return (
    <div className="mosaic" aria-hidden="true">
      {PANELS.map((rows, i) => (
        <svg key={i} viewBox="0 0 8 5" preserveAspectRatio="none" shapeRendering="crispEdges">
          {rows.flatMap((row, y) =>
            row.split('').map((k, x) => <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={COLORS[k]} />),
          )}
        </svg>
      ))}
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
              This is our very first meetup. It should feel like a relaxed Sunday with chai, good conversations and a few
              “oh, so that’s how it works” moments.
            </p>
          </div>
          <Mosaic />
        </div>
      </div>
    </section>
  );
}
