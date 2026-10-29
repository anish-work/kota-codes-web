import { useEffect, useMemo, useRef, useState } from 'react';

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Where each chunk of the text ends: a word and the space after it, long words in two, like a model streaming tokens.
function chunkEnds(text: string) {
  const ends: number[] = [];
  for (const m of text.matchAll(/\S+\s*/g)) {
    if (m[0].trim().length > 7) ends.push(m.index! + Math.ceil(m[0].length / 2));
    ends.push(m.index! + m[0].length);
  }
  return ends;
}

// A short beat between chunks, longer after a full stop or comma, as if it's thinking.
function pauseAfter(text: string, end: number) {
  const last = text.slice(0, end).trimEnd().slice(-1);
  return 20 + Math.random() * 30 + ('.!?'.includes(last) ? 260 : ',:;'.includes(last) ? 100 : 0);
}

// Text that streams in a chunk at a time behind a green square cursor, then calls onDone.
// Screen readers get the whole text at once from a hidden copy. With reduced motion it all appears at once.
export function Typed({ text, onDone }: { text: string; onDone?: () => void }) {
  const ends = useMemo(() => chunkEnds(text), [text]);
  const [shown, setShown] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (reducedMotion() || !ends.length) {
      setShown(text.length);
      done.current?.();
      return;
    }
    let i = 0;
    let timer = 0;
    const next = () => {
      setShown(ends[i]);
      i += 1;
      if (i < ends.length) timer = window.setTimeout(next, pauseAfter(text, ends[i - 1]));
      else done.current?.();
    };
    timer = window.setTimeout(next, 90);
    return () => clearTimeout(timer);
  }, [text, ends]);

  return (
    <>
      <span aria-hidden="true">
        {text.slice(0, shown)}
        {shown < text.length && <i className="caret" />}
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}
