import { SITE } from '../content';
import { Arrow } from './Arrow';
import { Pixel } from './Pixel';

// The green action block: follow on Instagram. Used on every page.
export function FollowBlock() {
  return (
    <a className="follow nudge" href={SITE.instagram} target="_blank" rel="noopener">
      <span>
        Follow <span className="at">{SITE.handle}</span> to hear about Meetup 02 first.
      </span>
      <Arrow />
    </a>
  );
}

// get-involved/: the follow block, then the ways to help, all through Instagram messages.
export function GetInvolved() {
  return (
    <section id="get-involved" aria-labelledby="get-involved-h">
      <div className="band">
        <div className="frame cells seat">
          <div className="pad left">
            <h2 id="get-involved-h">get-involved/</h2>
            <Pixel name="palace" />
          </div>
          <div className="right">
            <FollowBlock />
            <p className="pad ask">
              Want to speak, show a project, host a meetup or volunteer? Message us on Instagram:{' '}
              <a className="handle" href={SITE.instagram} target="_blank" rel="noopener">
                {SITE.handle}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
