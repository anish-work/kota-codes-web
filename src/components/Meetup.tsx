import { MEETUP_01, THANKS, TWIST, WENT } from '../content';
import { useFitText } from '../fit';
import { Arrow } from './Arrow';
import { Day } from './Day';
import { GetInvolved } from './Follow';
import { SectionHead } from './SectionHead';
import { Speakers } from './Speakers';

// /meetup-01: what happened on the day. Photos go in how-it-went/ once there are some.
export function MeetupPage() {
  return (
    <>
      <MeetupHead />
      <HowItWent />
      <Speakers />
      <Day />
      <GetInvolved />
      <BackHome />
    </>
  );
}

function MeetupHead() {
  const markRef = useFitText<HTMLHeadingElement>(240);
  return (
    <>
      <section className="band" aria-labelledby="meetup-h">
        <div className="frame">
          <div className="mark-cell">
            <h1 className="mark meetup-mark" id="meetup-h" ref={markRef}>
              <span>
                Meetup 01<span className="sq" aria-hidden="true"></span>
              </span>
            </h1>
          </div>
        </div>
      </section>
      <div className="band">
        <dl className="frame cells meet-meta">
          <div className="pad">
            <dt className="mono">when/</dt>
            <dd className="slash-big">
              <time dateTime={MEETUP_01.start.slice(0, 10)}>{MEETUP_01.date}</time>
            </dd>
          </div>
          <div className="pad">
            <dt className="mono">where/</dt>
            <dd className="slash-big">{MEETUP_01.where}</dd>
          </div>
        </dl>
      </div>
    </>
  );
}

function HowItWent() {
  return (
    <section aria-labelledby="how-it-went-h">
      <SectionHead id="how-it-went" title="how-it-went/" />
      <div className="band">
        <dl className="frame cells went">
          {WENT.map(([n, text]) => (
            <div key={n} className="pad">
              <dt>{n}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="band">
        <div className="frame cells went-notes">
          <div className="pad">
            <p className="mono">the-twist/</p>
            <p className="say-big">{TWIST}</p>
          </div>
          <div className="pad">
            <p className="mono">thank-you/</p>
            <p className="say-big">{THANKS}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BackHome() {
  return (
    <div className="band">
      <div className="frame pad back">
        <a className="ghost" href="/">
          <Arrow /> Back to the home page
        </a>
      </div>
    </div>
  );
}
