import { EVENT, SITE } from '../content';

export function Register() {
  return (
    <section className="band" id="register" aria-labelledby="register-h">
      <div className="frame cells seat">
        <div className="pad left">
          <p className="mono meta-tail">
            {EVENT.dateLabel} / {EVENT.timeLabel} / kota
          </p>
          <h2 id="register-h">save-your-seat/</h2>
        </div>
        <div className="pad right">
          <p>
            Entry is free, but seats are limited. The registration link will be shared on our Instagram very soon. Follow
            us so you don’t miss it.
          </p>
          <a className="btn" href={SITE.instagram} target="_blank" rel="noopener">
            Follow us on Instagram <span className="arrow" aria-hidden="true">↗</span>
          </a>
          <p className="small">
            Want to help organise or volunteer on the day? Send us a message on Instagram:{' '}
            <span className="handle">{SITE.handle}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
