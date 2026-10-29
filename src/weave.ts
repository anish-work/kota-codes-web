// Kota Doria weave geometry, from the Logo board in the graphics artifact.
// Threads are 4.2% of the mark; each thread breaks (0.36 x thread) beside the one passing over it,
// and crossings alternate over/under.

export type Rect = { x: number; y: number; w: number; h: number; cls: string };

// The K, row by row: X = green check.
const K = ['X...X', 'X..X.', 'XXX..', 'X..X.', 'X...X'];

export const MARK_SIZE = 440;

// maxX = null: no horizontal clipping (the border tile wraps).
function crossings(out: Rect[], xs: number[], ys: number[], t: number, br: number, maxX: number | null, maxY: number, check: string) {
  xs.forEach((x, i) =>
    ys.forEach((y, j) => {
      if ((i + j) % 2 === 0) {
        // Horizontal thread passes over: break the vertical one above and below.
        if (y - br >= 0) out.push({ x, y: y - br, w: t, h: br, cls: check });
        if (y + t + br <= maxY) out.push({ x, y: y + t, w: t, h: br, cls: check });
        out.push({ x: x - 0.6, y, w: t + 1.2, h: t, cls: 't' });
      } else {
        // Vertical thread passes over: break the horizontal one left and right.
        if (maxX === null || x - br >= 0) out.push({ x: x - br, y, w: br, h: t, cls: check });
        if (maxX === null || x + t + br <= maxX) out.push({ x: x + t, y, w: br, h: t, cls: check });
        out.push({ x, y: y - 0.6, w: t, h: t + 1.2, cls: 't' });
      }
    }),
  );
}

// A woven grid: one check per pattern cell (X = green), framed by threads on every side.
function clothRects(pattern: string[], pitch: number, t: number): Rect[] {
  const c = pitch - t;
  const cols = pattern[0].length;
  const w = cols * pitch + t;
  const h = pattern.length * pitch + t;
  const out: Rect[] = [];
  pattern.forEach((row, j) =>
    row.split('').forEach((ch, i) => out.push({ x: t + i * pitch, y: t + j * pitch, w: c, h: c, cls: ch === 'X' ? 'k' : 'c' })),
  );
  const ys = Array.from({ length: pattern.length + 1 }, (_, n) => n * pitch);
  const xs = Array.from({ length: cols + 1 }, (_, n) => n * pitch);
  ys.forEach((y) => out.push({ x: 0, y, w, h: t, cls: 't' }));
  xs.forEach((x) => out.push({ x, y: 0, w: t, h, cls: 't' }));
  crossings(out, xs, ys, t, t * 0.36, w, h, 'c');
  return out;
}

function markRects(size = MARK_SIZE): Rect[] {
  const t = size * 0.042;
  return clothRects(K, (size - t) / 5, t);
}

// One row of checks between two threads; a tile of 8 checks, green ones repeating G..G.... like the posts.
export const BORDER = { pitch: 28, thread: 4, tile: 8 };
export const BORDER_HEIGHT = BORDER.pitch + BORDER.thread;

function borderRects(): Rect[] {
  const { pitch: P, thread: T, tile: n } = BORDER;
  const out: Rect[] = [];
  for (let k = 0; k < n; k++) out.push({ x: k * P + T, y: T, w: P - T, h: P - T, cls: k === 0 || k === 3 ? 'g' : 'c' });
  [0, P].forEach((y) => out.push({ x: 0, y, w: n * P, h: T, cls: 't' }));
  // One extra column so breaks that wrap past the tile edge show up on the other side.
  const xs = Array.from({ length: n + 1 }, (_, k) => k * P);
  xs.forEach((x) => out.push({ x, y: 0, w: T, h: BORDER_HEIGHT, cls: 't' }));
  crossings(out, xs, [0, P], T, 1.5, null, BORDER_HEIGHT, 'c');
  return out;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function toSvg(rects: Rect[]) {
  return rects.map((r) => `<rect x="${r2(r.x)}" y="${r2(r.y)}" width="${r2(r.w)}" height="${r2(r.h)}" class="${r.cls}"/>`).join('');
}

export const MARK_SVG = toSvg(markRects());
export const BORDER_SVG = toSvg(borderRects());

// Any pattern of checks (X = green) woven at the border's proportions, like the band on a registration pass.
export function clothSvg(pattern: string[]) {
  const { pitch, thread } = BORDER;
  return { svg: toSvg(clothRects(pattern, pitch, thread)), w: pattern[0].length * pitch + thread, h: pattern.length * pitch + thread };
}
