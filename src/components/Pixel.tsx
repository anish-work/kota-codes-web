import { BORDER, BORDER_HEIGHT, BORDER_SVG } from '../weave';
import chhatriTall from '../illustrations/chhatri-tall.svg?raw';
import kotaSkyline from '../illustrations/kota-skyline.svg?raw';
import palace from '../illustrations/palace.svg?raw';
import riverFrontBell from '../illustrations/river-front-bell.svg?raw';

// "Kota in pixels" illustrations from the graphics artifact. They use fill="currentColor";
// CSS sizes them at whole-number scales (--k) so every pixel stays square.
const ART = { chhatri: chhatriTall, bell: riverFrontBell, palace, skyline: kotaSkyline };

function parse(raw: string) {
  const [, w, h] = raw.match(/viewBox="0 0 (\d+) (\d+)"/)!;
  const body = raw.slice(raw.indexOf('>') + 1, raw.lastIndexOf('</svg>')).replace(/<title>.*?<\/title>/, '');
  return { w, h, body };
}

export function Pixel({ name, className = '' }: { name: keyof typeof ART; className?: string }) {
  const { w, h, body } = parse(ART[name]);
  return (
    <svg
      className={`pix ${name} ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      style={{ '--w': w, '--h': h } as React.CSSProperties}
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

// Skyline over the water, then a one-row woven border like the edge of a Kota Doria sari.
export function PageEdge() {
  return (
    <div aria-hidden="true">
      <div className="skyline-band">
        <Pixel name="skyline" />
      </div>
      <div className="weave-band">
        <svg className="weave" width="100%" height={BORDER_HEIGHT} focusable="false">
          <defs>
            <pattern
              id="weave-tile"
              width={BORDER.pitch * BORDER.tile}
              height={BORDER_HEIGHT}
              patternUnits="userSpaceOnUse"
              dangerouslySetInnerHTML={{ __html: BORDER_SVG }}
            />
          </defs>
          <rect width="100%" height={BORDER_HEIGHT} fill="url(#weave-tile)" />
        </svg>
      </div>
    </div>
  );
}
