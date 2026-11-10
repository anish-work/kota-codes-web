import { MEETUP_01 } from '../content';
import { Arrow } from './Arrow';
import { FollowBlock } from './Follow';

// /register, after Meetup 01: say it's closed and where to hear about Meetup 02.
export function RegisterClosed() {
  return (
    <section aria-labelledby="register-h">
      <div className="band">
        <div className="frame">
          <div className="head">
            <h1 id="register-h">registration-closed/</h1>
          </div>
        </div>
      </div>
      <div className="band">
        <div className="frame cells seat closed">
          <div className="pad left">
            <p className="lead">Registration for Meetup 01 is closed.</p>
            <p>
              Meetup 01 was on {MEETUP_01.date} at {MEETUP_01.where}, and 65 people came. Meetup 02 is coming soon: its date
              and venue are to be announced.
            </p>
            <a className="ghost" href="/meetup-01">
              How Meetup 01 went <Arrow />
            </a>
          </div>
          <div className="right">
            <FollowBlock />
          </div>
        </div>
      </div>
    </section>
  );
}
