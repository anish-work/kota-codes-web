import { useMemo } from 'react';
import { CONFIG } from '../config';
import { EVENT } from '../content';
import { clothSvg } from '../weave';

// A seeded random number generator (mulberry32 on an FNV-1a hash), so the same name always weaves the same band.
function seeded(seed: string) {
  let a = 2166136261;
  for (const ch of seed) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Three rows of checks, mirrored down the middle like a sari border, about a third of them green.
function bandPattern(seed: string, cols = 17, rows = 3) {
  const rand = seeded(seed);
  const half = Math.ceil(cols / 2);
  return Array.from({ length: rows }, () => {
    const left = Array.from({ length: half }, () => (rand() < 0.36 ? 'X' : '.'));
    return [...left, ...left.slice(0, cols - half).reverse()].join('');
  });
}

// The pass the bot prints once a seat is saved: a woven band that's different for every person, their name, and
// the day's facts. It slides out of the printer slot line by line, then gets stamped (see .pass in styles.css).
export function Pass({ name, role, seed, stamp }: { name: string; role: string; seed: string; stamp: string }) {
  const band = useMemo(() => clothSvg(bandPattern(seed)), [seed]);
  return (
    <div className="pass-slot">
      <article className="pass" aria-label={`Pass for ${name}`}>
        <svg className="pass-band" viewBox={`0 0 ${band.w} ${band.h}`} aria-hidden="true" focusable="false"
          dangerouslySetInnerHTML={{ __html: band.svg }} />
        <p className="pass-top mono">
          <span>{EVENT.name.toLowerCase()}</span>
          <span>admit one · free</span>
        </p>
        <p className="pass-name">{name}</p>
        <p className="pass-role mono">{role.toLowerCase()}</p>
        <dl className="pass-facts">
          <div>
            <dt>when</dt>
            <dd>
              {EVENT.date}
              <br />
              {EVENT.time}
            </dd>
          </div>
          <div>
            <dt>where</dt>
            <dd>{EVENT.where ?? `${EVENT.city}, venue to be announced`}</dd>
          </div>
          <div>
            <dt>bring</dt>
            <dd>{CONFIG.whatToBring}</dd>
          </div>
        </dl>
        <p className="pass-foot">
          <span className="mono">kota.codes</span>
          <span className="stamp mono">{stamp}</span>
        </p>
      </article>
    </div>
  );
}
