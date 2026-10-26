import { EVENT, SITE } from '../content';
import { Arrow } from './Arrow';
import { Pixel } from './Pixel';
import { RegisterForm } from './RegisterForm';

// The save-your-seat section. On the home page it links to /register; on /register it holds the form.
export function Register({ form = false }: { form?: boolean }) {
  const Heading = form ? 'h1' : 'h2';
  return (
    <section id="register" aria-labelledby="register-h">
      <div className="band">
        <div className="frame cells seat">
          <div className="pad left">
            <p className="mono meta-tail">
              {EVENT.when} / {(EVENT.where ?? EVENT.city).toLowerCase()}
            </p>
            <Heading id="register-h">save-your-seat/</Heading>
            <Pixel name="palace" />
          </div>
          <div className="pad right">
            <p>
              Entry is free, and snacks and coffee are on us. Seats are limited, so tell us you’re coming. It takes
              about two minutes.
            </p>
            {form ? (
              <p className="small">
                New here? <a href="/">Read about the day, the speakers and the FAQ</a>.
              </p>
            ) : (
              <a className="btn big nudge" href="/register">
                Register now <Arrow />
              </a>
            )}
            <p className="small">
              Want to help organise or volunteer on the day? Message us on Instagram:{' '}
              <a className="handle" href={SITE.instagram} target="_blank" rel="noopener">
                {SITE.handle}
              </a>
            </p>
          </div>
        </div>
      </div>
      {form && (
        <div className="band" id="register-form">
          <RegisterForm />
        </div>
      )}
    </section>
  );
}
