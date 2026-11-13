import { useCallback, useEffect, useRef, useState, type Dispatch, type MouseEvent, type PointerEvent, type SetStateAction } from 'react';
import { GALLERY, type Shot } from '../content';
import { cellsToPath } from '../pixel';
import { Arrow } from './Arrow';
import { SectionHead } from './SectionHead';

// Pixel marks on the same square grid as the arrow: a play triangle for video tiles and a cross for closing.
const PLAY = ['##.....', '####...', '######.', '#######', '######.', '####...', '##.....'];
const CROSS = ['##....##', '###..###', '.######.', '..####..', '..####..', '.######.', '###..###', '##....##'];

function Glyph({ cells }: { cells: string[] }) {
  return (
    <svg viewBox={`0 0 ${cells[0].length} ${cells.length}`} fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path d={cellsToPath(cells)} />
    </svg>
  );
}

const two = (n: number) => String(n).padStart(2, '0');
const N = GALLERY.length;

// photos/: the group photo across the frame, then a grid of the rest. Any of them opens the lightbox at that picture.
export function Gallery() {
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (index !== null && d && !d.open) d.showModal();
  }, [index]);

  const show = (i: number) => (e: MouseEvent<HTMLButtonElement>) => {
    opener.current = e.currentTarget;
    setIndex(i);
  };
  const [lead, ...rest] = GALLERY;

  return (
    <section aria-labelledby="photos-h">
      <SectionHead id="photos" title="photos/" />
      <div className="band">
        <div className="frame">
          <button type="button" className="tile lead" onClick={show(0)} aria-haspopup="dialog">
            <img
              src={lead.thumb}
              srcSet={`${lead.thumb} 1280w, ${lead.full} 2400w`}
              sizes="(min-width: 1312px) 1278px, calc(100vw - 34px)"
              alt={lead.alt}
              loading="lazy"
              decoding="async"
            />
          </button>
        </div>
      </div>
      <div className="band">
        <div className="frame cells gallery">
          {rest.map((s, k) => (
            <Tile key={s.id} shot={s} onClick={show(k + 1)} />
          ))}
        </div>
      </div>
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label="Meetup 01 photos and videos"
        onClose={() => {
          setIndex(null);
          opener.current?.focus();
        }}
      >
        {index !== null && <Viewer index={index} setIndex={setIndex} close={() => dialog.current?.close()} />}
      </dialog>
    </section>
  );
}

function Tile({ shot, onClick }: { shot: Shot; onClick: (e: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button type="button" className={shot.wide ? 'tile wide' : 'tile'} onClick={onClick} aria-haspopup="dialog">
      <img src={shot.thumb} alt={shot.alt} loading="lazy" decoding="async" />
      {shot.video && (
        <span className="play">
          <Glyph cells={PLAY} />
          {shot.length}
        </span>
      )}
    </button>
  );
}

// The lightbox: one picture at a time, with arrows, swipes, the arrow keys and a strip of every picture to jump to.
// It wraps round at both ends. Escape, the close button or a click beside the picture closes it.
function Viewer({ index, setIndex, close }: { index: number; setIndex: Dispatch<SetStateAction<number | null>>; close: () => void }) {
  const shot = GALLERY[index];
  const [dir, setDir] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const go = useCallback(
    (d: number) => {
      setDir(d);
      setIndex((i) => (i === null ? i : (i + d + N) % N));
    },
    [setIndex],
  );
  const jump = (i: number) => {
    setDir(i > index ? 1 : -1);
    setIndex(i);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'VIDEO') return; // the arrow keys seek there
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // Load the pictures either side, so the next one is ready.
  useEffect(() => {
    for (const d of [1, -1]) new Image().src = GALLERY[(index + d + N) % N].full;
  }, [index]);

  useEffect(() => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    strip.current?.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: smooth ? 'smooth' : 'auto' });
  }, [index]);

  const down = (e: PointerEvent) => {
    swipe.current = (e.target as HTMLElement).tagName === 'VIDEO' ? null : { x: e.clientX, y: e.clientY };
  };
  const up = (e: PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) {
      swiped.current = true;
      go(dx < 0 ? 1 : -1);
    }
  };

  return (
    <>
      <div className="lb-top">
        <p className="lb-count">
          <b>{two(index + 1)}</b> / {two(N)}
        </p>
        <button type="button" className="lb-close" onClick={close}>
          <Glyph cells={CROSS} />
          Close
        </button>
      </div>
      <div
        className="lb-stage"
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={() => (swipe.current = null)}
        onClick={(e) => {
          if (swiped.current) swiped.current = false;
          else if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('lb-media')) close();
        }}
      >
        <div className="lb-media" key={shot.id} style={{ '--dir': dir } as React.CSSProperties}>
          {shot.video ? (
            <video src={shot.video} poster={shot.full} width={shot.w} height={shot.h} controls playsInline autoPlay preload="auto" aria-label={shot.alt} />
          ) : (
            <img src={shot.full} alt={shot.alt} width={shot.w} height={shot.h} draggable={false} />
          )}
        </div>
        <button type="button" className="lb-nav lb-prev" onClick={() => go(-1)} aria-label="Previous">
          <Arrow />
        </button>
        <button type="button" className="lb-nav lb-next" onClick={() => go(1)} aria-label="Next">
          <Arrow />
        </button>
      </div>
      <p className="lb-caption" aria-live="polite">
        {shot.caption}
      </p>
      <div className="lb-strip" ref={strip} role="group" aria-label="All photos and videos">
        {GALLERY.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => jump(i)}
            aria-current={i === index ? 'true' : undefined}
            aria-label={`${two(i + 1)} of ${two(N)}: ${s.caption}`}
          >
            <img src={s.thumb} alt="" loading="lazy" decoding="async" />
            {s.video && <Glyph cells={PLAY} />}
          </button>
        ))}
      </div>
    </>
  );
}
