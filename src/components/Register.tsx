import { EVENT, SITE } from '../content';
import { Arrow } from './Arrow';
import { Pixel } from './Pixel';
import { RegisterChat } from './RegisterChat';

// The save-your-seat section at the end of the home page, linking to /register.
export function Register() {
  return (
    <section id="register" aria-labelledby="register-h">
      <div className="band">
        <div className="frame cells seat">
          <div className="pad left">
            <p className="mono meta-tail">
              {EVENT.when} / {(EVENT.where ?? EVENT.city).toLowerCase()}
            </p>
            <h2 id="register-h">save-your-seat/</h2>
            <Pixel name="palace" />
          </div>
          <div className="pad right">
            <p>
              Entry is free, and snacks and coffee are on us. Seats are limited, so tell us you’re coming. It takes 30
              seconds.
            </p>
            <a className="btn big nudge" href="/register">
              Register now <Arrow />
            </a>
            <p className="small">
              Want to help organise or volunteer on the day? Message us on Instagram:{' '}
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

// /register: the chat with the bot, first thing under the header. The bot's intro does the introducing; the heading
// is for screen readers and search.
export function RegisterPage() {
  return (
    <section id="register" aria-labelledby="register-h">
      <h1 id="register-h" className="sr-only">
        Save your seat at {EVENT.name}
      </h1>
      <div className="band chat-band" id="register-form">
        <div className="frame">
          <RegisterChat />
        </div>
      </div>
    </section>
  );
}
