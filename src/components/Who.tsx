import { WHO } from '../content';
import { SectionHead } from './SectionHead';

export function Who() {
  return (
    <section aria-labelledby="who-h">
      <SectionHead id="who" title="who-can-come/" />
      <div className="band">
        <ul className="frame cells who">
          {WHO.map((w) => (
            <li key={w.title} className="pad">
              <strong>{w.title}</strong>
              <span>{w.note}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="band">
        <div className="frame pad">
          <p className="note">You don’t need to know coding. Everything is explained in simple words.</p>
        </div>
      </div>
    </section>
  );
}
