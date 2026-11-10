import { NEXT } from '../content';
import { SectionHead } from './SectionHead';

// whats-next/: what's coming, each with a plain status line saying what's still to be decided.
export function Next() {
  return (
    <section aria-labelledby="whats-next-h">
      <SectionHead id="whats-next" title="whats-next/" />
      <div className="band">
        <ul className="frame cells next">
          {NEXT.map((n, i) => (
            <li key={n.title} className="pad">
              <p className="mono idx">{String(i + 1).padStart(2, '0')}/</p>
              <h3>
                {n.title}
                {n.planned && <span className="planned"> (planned)</span>}
              </h3>
              <p className="text">{n.text}</p>
              <p className="mono status">{n.status}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
