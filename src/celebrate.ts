// "You're in" celebration: rockets go up, the page shakes as they burst, and the confetti flies into LET'S GO.
// Square confetti on a grid, so the words come out in the same pixel style as the Kota illustrations.
// Draws on a fixed canvas outside #root (only #root shakes), and removes itself after about five seconds.

type Rocket = { x: number; y0: number; y1: number; launch: number; rise: number; color: string; burst: boolean };
type Bit = {
  x: number; y: number; vx: number; vy: number; color: string; size: number; spin: number;
  tx?: number; ty?: number; delay: number; from?: { x: number; y: number };
};
type Spark = { x: number; y: number; vx: number; vy: number; size: number; born: number };

const MARIGOLD = '#F0A030';
const GRAVITY = 900; // px/s²
const DRAG = 1.6; // per second
const FORM_DELAY = 450; // ms after the last burst before the confetti heads for the letters
const FORM_TIME = 750;
const HOLD = 1100;

// A pixel rocket, 5×7 cells, drawn at ROCKET_CELL px per cell: body (#), window (o), fins along the bottom.
const ROCKET = ['..#..', '.###.', '.#o#.', '.###.', '.###.', '#####', '#.#.#'];
const ROCKET_CELL = 3;

const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

// Grid points covering LET'S GO, centred in a w×h screen. Two lines on narrow screens so the letters stay big.
function letterPoints(w: number, h: number, font: string) {
  const lines = w < 640 ? ['LET’S', 'GO'] : ['LET’S GO'];
  const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  c.font = `800 100px ${font}`;
  const widest = Math.max(...lines.map((l) => c.measureText(l).width));
  const size = Math.min((100 * Math.min(w - 48, 1000)) / widest, (h * 0.6) / lines.length / 0.9);
  const step = Math.max(4, Math.min(12, Math.round(size / 16)));
  const lineH = size * 0.9;

  c.canvas.width = w;
  c.canvas.height = h;
  c.font = `800 ${size}px ${font}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lineH));

  const data = c.getImageData(0, 0, w, h).data;
  const pts: { x: number; y: number }[] = [];
  for (let y = step / 2; y < h; y += step)
    for (let x = step / 2; x < w; x += step) if (data[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] > 128) pts.push({ x, y });
  return { pts, step };
}

function shake() {
  const body = document.body;
  body.classList.remove('shaking');
  void body.offsetWidth; // restart the animation if it's already running
  body.classList.add('shaking');
  setTimeout(() => body.classList.remove('shaking'), 700);
  navigator.vibrate?.([40, 60, 90]); // phones that can (Android) buzz with the shake
}

export function celebrate(): () => void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const bg = token('--bg');
  const hi = token('--hi');
  const confetti = [token('--green'), hi, token('--ink'), MARIGOLD];
  const letters = [token('--green-text'), token('--green-text'), token('--ink'), MARIGOLD];

  const w = innerWidth;
  const h = innerHeight;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.className = 'celebrate';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const { pts, step } = letterPoints(w, h, token('--sans'));

  // Rockets spread across the screen, each bursting at its own height.
  const count = w < 640 ? 3 : 5;
  const rockets: Rocket[] = Array.from({ length: count }, (_, i) => ({
    x: (w * (i + 0.5)) / count + rand(-20, 20),
    y0: h + 20,
    y1: h * rand(0.15, 0.4),
    launch: i * 140 + rand(0, 60),
    rise: rand(620, 780),
    color: pick([token('--green'), token('--ink')]),
    burst: false,
  }));
  const lastBurst = Math.max(...rockets.map((r) => r.launch + r.rise));
  const formAt = lastBurst + FORM_DELAY;
  const releaseAt = formAt + 250 + FORM_TIME + HOLD;

  // Each rocket owns the letter points in its slice of the screen, so the confetti crosses less on the way in.
  pts.sort((a, b) => a.x - b.x);
  const shares = rockets.map((_, i) => pts.slice(Math.floor((i * pts.length) / count), Math.floor(((i + 1) * pts.length) / count)));

  const bits: Bit[] = [];
  const sparks: Spark[] = [];
  let shaken = false;
  let released = false;
  let start = 0;
  let last = 0;
  let frame = 0;

  function burst(r: Rocket, i: number, y: number) {
    r.burst = true;
    if (!shaken) {
      shaken = true;
      shake();
    }
    const add = (target?: { x: number; y: number }) => {
      const a = rand(0, Math.PI * 2);
      const s = rand(180, 720);
      bits.push({
        x: r.x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120,
        color: pick(target ? letters : confetti), size: rand(4, 8), spin: rand(0, Math.PI * 2),
        tx: target?.x, ty: target?.y, delay: rand(0, 250),
      });
    };
    shares[i].forEach(add);
    for (let k = 0; k < 50; k++) add();
  }

  function tick(now: number) {
    if (!start) start = last = now;
    const t = now - start;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const drag = Math.exp(-DRAG * dt);

    ctx.clearRect(0, 0, w, h);

    // Fade the page back while the words are up, so they read over the form.
    const fade = Math.min(1, Math.max(0, (t - formAt) / 600)) * (1 - Math.min(1, Math.max(0, (t - releaseAt) / 400)));
    if (fade > 0) {
      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    rockets.forEach((r, i) => {
      if (r.burst || t < r.launch) return;
      const p = Math.min(1, (t - r.launch) / r.rise);
      const y = r.y0 + (r.y1 - r.y0) * (1 - (1 - p) ** 2);
      const x = r.x + Math.sin(p * 6 + i) * 4;
      // The rocket with its nose at (x, y), a flickering flame under the middle fin, then sparks left behind.
      const k = ROCKET_CELL;
      const left = Math.round(x) - 2.5 * k;
      const top = Math.round(y);
      ROCKET.forEach((row, ry) =>
        [...row].forEach((cell, rx) => {
          if (cell === '.') return;
          ctx.fillStyle = cell === 'o' ? bg : r.color;
          ctx.fillRect(left + rx * k, top + ry * k, k, k);
        }),
      );
      const tail = top + ROCKET.length * k;
      ctx.fillStyle = Math.random() < 0.5 ? MARIGOLD : hi;
      ctx.fillRect(left + 1.5 * k, tail, 2 * k, k * Math.round(rand(1, 4)));
      for (let n = 0; n < 2; n++)
        sparks.push({ x: x + rand(-k, k), y: tail + 2 * k, vx: rand(-50, 50), vy: rand(40, 160), size: rand(2, 4), born: t });
      if (p >= 1) burst(r, i, y);
    });

    for (let k = sparks.length - 1; k >= 0; k--) {
      const s = sparks[k];
      const age = (t - s.born) / 500;
      if (age >= 1) {
        sparks.splice(k, 1);
        continue;
      }
      s.vy += GRAVITY * 0.3 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = MARIGOLD;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
    }
    ctx.globalAlpha = 1;

    if (t >= releaseAt && !released) {
      released = true;
      bits.forEach((b) => {
        if (b.tx === undefined) return;
        b.tx = b.ty = undefined;
        b.vx = rand(-160, 160);
        b.vy = rand(-320, -40);
      });
    }

    let alive = sparks.length > 0 || rockets.some((r) => !r.burst);
    for (const b of bits) {
      let size = b.size;
      let flat = Math.abs(Math.cos(b.spin));
      if (b.tx !== undefined && b.ty !== undefined && t >= formAt + b.delay) {
        // Fly to its letter cell and become one square of the word.
        if (!b.from) b.from = { x: b.x, y: b.y };
        const p = easeInOut(Math.min(1, (t - formAt - b.delay) / FORM_TIME));
        b.x = b.from.x + (b.tx - b.from.x) * p;
        b.y = b.from.y + (b.ty - b.from.y) * p;
        size = b.size + (step - 1 - b.size) * p;
        flat = flat + (1 - flat) * p;
        alive = true;
      } else {
        b.vx *= drag;
        b.vy = b.vy * drag + GRAVITY * dt;
        b.x += b.vx * dt + Math.sin(t / 180 + b.spin) * 0.6;
        b.y += b.vy * dt;
        b.spin += dt * 9;
        if (b.y < h + 20) alive = true;
      }
      const sw = Math.max(1, size * flat);
      ctx.fillStyle = b.color;
      ctx.fillRect(Math.round(b.x - sw / 2), Math.round(b.y - size / 2), Math.round(sw), Math.round(size));
    }

    if (alive || t < releaseAt) frame = requestAnimationFrame(tick);
    else canvas.remove();
  }

  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    canvas.remove();
    document.body.classList.remove('shaking');
  };
}
