import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { celebrate } from '../celebrate';
import { CONFIG } from '../config';
import { EVENT } from '../content';
import {
  AI_EXPERIENCE,
  DESCRIBES,
  EMPTY,
  HEARD_FROM,
  LAPTOP,
  SCHOOL_STUDENT,
  submit,
  validate,
  type Errors,
  type FieldName,
  type FormValues,
  type Result,
} from '../registration';

type Phase = { kind: 'idle' } | { kind: 'sending' } | { kind: 'failed'; message: string } | { kind: 'done'; result: Result };

// Order used to move focus to the first field with a problem.
const ORDER: FieldName[] = ['name', 'whatsapp', 'email', 'describes', 'aiExperience', 'laptop', 'parentPermission', 'photoConsent'];

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p className="err" id={`${id}-err`}>
      <span>{msg}</span>
    </p>
  ) : null;
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="field pad">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {children}
      <Err id={id} msg={error} />
    </div>
  );
}

function Choice(props: {
  name: FieldName;
  legend: string;
  options: string[];
  value: string;
  error?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const { name, legend, options, value, error, onChange } = props;
  return (
    <fieldset className="field pad" id={`f-${name}`} aria-describedby={error ? `f-${name}-err` : undefined}>
      <legend>{legend}</legend>
      <div className="opts">
        {options.map((o) => (
          <label className="opt" key={o}>
            <input type="radio" name={name} value={o} checked={value === o} onChange={onChange} aria-invalid={!!error} />
            <span>{o}</span>
          </label>
        ))}
      </div>
      <Err id={`f-${name}`} msg={error} />
    </fieldset>
  );
}

function Details() {
  const venue = CONFIG.venue.name ? [CONFIG.venue.name, CONFIG.venue.address].filter(Boolean).join(', ') : null;
  return (
    <dl className="details">
      <div>
        <dt>date</dt>
        <dd>Sunday, 1 November 2026</dd>
      </div>
      <div>
        <dt>time</dt>
        <dd>{EVENT.timeLabel}</dd>
      </div>
      <div>
        <dt>venue</dt>
        <dd>
          {venue ?? 'In Kota, to be announced. We’ll email you and post it on Instagram.'}
          {venue && CONFIG.venue.mapsUrl && (
            <>
              {' '}
              <a href={CONFIG.venue.mapsUrl} target="_blank" rel="noopener">
                Open in Maps
              </a>
            </>
          )}
        </dd>
      </div>
      <div>
        <dt>bring</dt>
        <dd>{CONFIG.whatToBring}</dd>
      </div>
    </dl>
  );
}

const OUTCOME: Record<string, { title: string; body: string }> = {
  registered: {
    title: 'You’re in.',
    body: 'Your seat is saved. We’ve sent the details to your email too. Chai, snacks and lunch are on us.',
  },
  duplicate: {
    title: 'You’re already registered.',
    body: 'We already have a signup with this name and WhatsApp number, so there’s nothing more to do. See you there.',
  },
  waitlist: {
    title: 'You’re on the waitlist.',
    body: 'All seats are taken for now. If someone drops out, we’ll message you on WhatsApp and email, in the order people signed up.',
  },
  closed: {
    title: 'Registrations are closed.',
    body: 'We’re not taking new signups for this meetup. Follow us on Instagram, @kota.codes, to hear about the next one.',
  },
};

// Shown after every submit, whatever the result, so nobody leaves without a way to stay in touch.
function JoinCommunity({ className }: { className: string }) {
  if (!CONFIG.whatsappCommunityUrl) return null;
  return (
    <a className={className} href={CONFIG.whatsappCommunityUrl} target="_blank" rel="noopener">
      Join the WhatsApp community <span className="arrow" aria-hidden="true">→</span>
    </a>
  );
}

function Outcome({ result }: { result: Result }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const o = OUTCOME[result.status] ?? OUTCOME.registered;

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.closest('.band')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (result.status === 'registered') return celebrate();
  }, [result.status]);

  return (
    <div className="frame cells done" role="status">
      <div className="pad done-head">
        <h3 ref={ref} tabIndex={-1}>
          {o.title}
        </h3>
        <p>{o.body}</p>
      </div>
      <div className="pad done-side">
        <Details />
        <JoinCommunity className="btn" />
      </div>
    </div>
  );
}

export function RegisterForm() {
  const [v, setV] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [tried, setTried] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const formRef = useRef<HTMLFormElement>(null);

  const isSchool = v.describes === SCHOOL_STUDENT;

  function update<K extends FieldName>(name: K, value: FormValues[K]) {
    const next = { ...v, [name]: value };
    setV(next);
    // After the first submit attempt, re-check as people fix things so errors clear live.
    if (tried) setErrors(validate(next));
  }

  const onText = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    update(e.target.name as FieldName, e.target.value);
  const onCheck = (e: ChangeEvent<HTMLInputElement>) => update(e.target.name as FieldName, e.target.checked);

  async function send() {
    setPhase({ kind: 'sending' });
    try {
      const result = await submit(v);
      // "closed" means the Settings tab says Registrations open: No. Show it as an outcome, not an error to retry.
      if (result.ok || result.status === 'closed') setPhase({ kind: 'done', result });
      else setPhase({ kind: 'failed', message: result.message || 'Something went wrong on our side. Please try again.' });
    } catch {
      setPhase({
        kind: 'failed',
        message: 'We couldn’t send your registration. Check your internet connection and try again.',
      });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (phase.kind === 'sending') return;
    setTried(true);
    const found = validate(v);
    setErrors(found);
    const first = ORDER.find((k) => found[k]);
    if (first) {
      const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
      el?.focus();
      return;
    }
    send();
  }

  if (phase.kind === 'done') return <Outcome result={phase.result} />;

  const sending = phase.kind === 'sending';
  const desc = (id: string, hint = false) =>
    [hint && `${id}-hint`, errors[id.replace('f-', '') as FieldName] && `${id}-err`].filter(Boolean).join(' ') || undefined;

  return (
    <form ref={formRef} className="frame cells reg" onSubmit={onSubmit} noValidate aria-labelledby="register-h">
      <Field id="f-name" label="Full name" hint="as you’d like it on your name tag" error={errors.name}>
        <input id="f-name" name="name" autoComplete="name" value={v.name} onChange={onText} maxLength={100}
          aria-invalid={!!errors.name} aria-describedby={desc('f-name', true)} />
      </Field>
      <Field id="f-whatsapp" label="WhatsApp number" hint="10 digits, +91 is optional" error={errors.whatsapp}>
        <input id="f-whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" value={v.whatsapp}
          onChange={onText} maxLength={20} placeholder="98765 43210"
          aria-invalid={!!errors.whatsapp} aria-describedby={desc('f-whatsapp', true)} />
      </Field>
      <Field id="f-email" label="Email" hint="we’ll send your confirmation here" error={errors.email}>
        <input id="f-email" name="email" type="email" inputMode="email" autoComplete="email" value={v.email}
          onChange={onText} maxLength={150} aria-invalid={!!errors.email} aria-describedby={desc('f-email', true)} />
      </Field>

      <Choice name="describes" legend="Which describes you best?" options={DESCRIBES} value={v.describes}
        error={errors.describes} onChange={onText} />
      <Choice name="aiExperience" legend="Have you used AI tools before?" options={AI_EXPERIENCE} value={v.aiExperience}
        error={errors.aiExperience} onChange={onText} />
      <Choice name="laptop" legend="Will you bring a laptop?" options={LAPTOP} value={v.laptop}
        error={errors.laptop} onChange={onText} />

      <Field id="f-org" label="College, school or workplace" hint="optional">
        <input id="f-org" name="org" autoComplete="organization" value={v.org} onChange={onText} maxLength={150}
          aria-describedby="f-org-hint" />
      </Field>
      <Field id="f-heardFrom" label="How did you hear about Kota Codes?" hint="optional">
        <select id="f-heardFrom" name="heardFrom" value={v.heardFrom} onChange={onText} aria-describedby="f-heardFrom-hint">
          <option value="">Choose one</option>
          {HEARD_FROM.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </Field>

      <Field id="f-learn" label="What would you like to learn or ask?" hint="optional. a question, a topic, anything" >
        <textarea id="f-learn" name="learn" rows={4} value={v.learn} onChange={onText} maxLength={1000}
          aria-describedby="f-learn-hint" />
      </Field>

      <div className="field pad consent">
        {isSchool && (
          <div className="check">
            <label>
              <input type="checkbox" name="parentPermission" checked={v.parentPermission} onChange={onCheck}
                aria-invalid={!!errors.parentPermission}
                aria-describedby={errors.parentPermission ? 'f-parentPermission-err' : undefined} />
              <span>I’m under 18 and a parent has agreed I can come</span>
            </label>
            <Err id="f-parentPermission" msg={errors.parentPermission} />
          </div>
        )}
        <div className="check">
          <label>
            <input type="checkbox" name="photoConsent" checked={v.photoConsent} onChange={onCheck}
              aria-invalid={!!errors.photoConsent}
              aria-describedby={errors.photoConsent ? 'f-photoConsent-err' : undefined} />
            <span>I’m okay with photos and video at the event</span>
          </label>
          <Err id="f-photoConsent" msg={errors.photoConsent} />
        </div>
      </div>

      {/* Honeypot: hidden from people, often filled in by bots. */}
      <div className="hp" aria-hidden="true">
        <label>
          Leave this empty
          <input name="website" tabIndex={-1} autoComplete="off" value={v.website} onChange={onText} />
        </label>
      </div>

      <div className="pad submit-note">
        {phase.kind === 'failed' ? (
          <div className="failed" role="alert">
            <p>{phase.message}</p>
            <div className="actions">
              <button type="button" className="ghost" onClick={send}>
                Try again
              </button>
              <JoinCommunity className="ghost" />
            </div>
          </div>
        ) : (
          <p className="hint">
            {tried && Object.keys(errors).length
              ? 'a few answers need a look. they’re marked above.'
              : 'free entry. we only use your details to run kota codes events.'}
          </p>
        )}
      </div>
      <button type="submit" className="submit" disabled={sending} aria-busy={sending}>
        <span>{sending ? 'Saving your seat…' : 'Save my seat'}</span>
        <span className="arrow" aria-hidden="true">→</span>
      </button>
    </form>
  );
}
