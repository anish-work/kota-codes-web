import { EVENT, SITE } from '../content';
import { Pixel } from './Pixel';
import { RegisterForm } from './RegisterForm';

export function Register() {
  return (
    <section id="register" aria-labelledby="register-h">
      <div className="band">
        <div className="frame cells seat">
          <div className="pad left">
            <p className="mono meta-tail">
              {EVENT.when} / kota
            </p>
            <h2 id="register-h">save-your-seat/</h2>
            <Pixel name="palace" />
          </div>
          <div className="pad right">
            <p>
              Entry is free, and chai, snacks and lunch are on us. Seats are limited, so tell us you’re coming. It takes
              about two minutes.
            </p>
            <p className="small">
              Want to help organise or volunteer on the day? Message us on Instagram:{' '}
              <a className="handle" href={SITE.instagram} target="_blank" rel="noopener">
                {SITE.handle}
              </a>
            </p>
          </div>
        </div>
      </div>
      <div className="band" id="register-form">
        <RegisterForm />
      </div>
    </section>
  );
}
