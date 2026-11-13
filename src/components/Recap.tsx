import { MEETUP_01, RECAP } from '../content';
import { Arrow } from './Arrow';
import { SectionHead } from './SectionHead';

// meetup-01/ on the home page: the day in a few lines, and the way to the full page.
export function Recap() {
  return (
    <section aria-labelledby="meetup-01-h">
      <SectionHead id="meetup-01" title="meetup-01/" />
      <div className="band">
        <div className="frame cells recap">
          <ul className="lines">
            {RECAP.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="pad go">
            <p className="mono">
              <time dateTime={MEETUP_01.start.slice(0, 10)}>{MEETUP_01.date.toLowerCase()}</time>
              <br />
              {MEETUP_01.where.toLowerCase()}
            </p>
            <a className="btn big nudge" href="/meetup-01">
              See the full recap <Arrow />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
