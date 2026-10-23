import { TAKEAWAYS } from '../content';
import { SectionHead } from './SectionHead';

export function Takeaways() {
  return (
    <section aria-labelledby="takeaways-h">
      <SectionHead id="takeaways" title="take-home/" />
      <div className="band">
        <ul className="frame cells take">
          {TAKEAWAYS.map((t) => (
            <li key={t} className="pad">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
