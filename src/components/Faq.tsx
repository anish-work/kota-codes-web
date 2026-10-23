import { FAQ } from '../content';
import { SectionHead } from './SectionHead';

export function Faq() {
  return (
    <section aria-labelledby="faq-h">
      <SectionHead id="faq" title="questions/" />
      <div className="band">
        <div className="frame faq">
          {FAQ.map(({ q, a }) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
