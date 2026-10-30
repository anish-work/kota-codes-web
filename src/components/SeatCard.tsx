import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FocusEvent, type FormEvent, type ReactNode } from 'react';
import {
  AI_EXPERIENCE,
  DESCRIBES,
  EMPTY,
  LAPTOP,
  SCHOOL_STUDENT,
  firstName,
  validate,
  type Errors,
  type FieldName,
  type FormValues,
} from '../registration';
import { Arrow } from './Arrow';
import { Typed } from './Typed';

// Every answer the card needs, in the order focus moves through them, and how each is named in the "still needed" line.
const NEEDED: [FieldName, string][] = [
  ['name', 'name'],
  ['whatsapp', 'whatsapp number'],
  ['email', 'email'],
  ['describes', 'what describes you'],
  ['aiExperience', 'ai tools'],
  ['laptop', 'laptop'],
  ['parentPermission', 'parent’s permission'],
  ['photoConsent', 'photo okay'],
];

type ChoiceName = 'describes' | 'aiExperience' | 'laptop';

// The bot's one-line reply to each choice, so the card feels like it's listening.
const REPLIES: Record<ChoiceName, Record<string, string>> = {
  describes: {
    'College student': 'nice. any course, any year is welcome.',
    [SCHOOL_STUDENT]: 'welcome! you’ll need a parent’s okay, there’s a box for it below.',
    'Coaching student': 'a morning off from the books. you’ve earned it.',
    'Working or freelancing': 'you’ll leave with ways to save time with ai at work.',
    'Business owner': 'you’ll see what ai can do for your business.',
    'Teacher or parent': 'you’ll get to know the tools your students and children use.',
    Other: 'curious is all you need.',
  },
  aiExperience: {
    Never: 'perfect. the morning is made for you.',
    'A few times': 'nice. you’ll try a lot more on the day.',
    Often: 'great. you’ll still pick up new tricks.',
  },
  laptop: {
    Yes: 'great. bring the charger too.',
    No: 'no problem. your phone is enough.',
    'Phone only': 'that works. your phone is enough.',
  },
};

// Rows rise in one after another when the card appears; --i sets each one's turn.
const turn = (i: number) => ({ '--i': i }) as CSSProperties;
const num = (n: number) => `${String(n).padStart(2, '0')}/`;

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p className="err" id={`${id}-err`}>
      <span>{msg}</span>
    </p>
  ) : null;
}

// The bot's reply under an answer, typed out again whenever the answer changes.
function Reply({ text }: { text?: string }) {
  return text ? (
    <p className="reply" aria-hidden="true">
      <Typed key={text} text={text} />
    </p>
  ) : null;
}

function Ask(props: { n: number; id: string; label: string; hint: string; error?: string; reply?: string; children: ReactNode }) {
  const { n, id, label, hint, error, reply, children } = props;
  return (
    <div className="q text" style={turn(n)}>
      <div className="qhead">
        <label className="ql" htmlFor={id}>
          <span className="qn" aria-hidden="true">{num(n)}</span>
          {label}
        </label>
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      </div>
      {children}
      <Reply text={reply} />
      <Err id={id} msg={error} />
    </div>
  );
}

function Chips(props: {
  n: number;
  name: ChoiceName;
  legend: string;
  options: string[];
  value: string;
  error?: string;
  half?: boolean; // short enough to sit beside another question on wide screens
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const { n, name, legend, options, value, error, half, onChange } = props;
  return (
    <fieldset className={half ? 'q half' : 'q'} id={`f-${name}`} style={turn(n)} aria-describedby={error ? `f-${name}-err` : undefined}>
      <legend className="ql">
        <span className="qn" aria-hidden="true">{num(n)}</span>
        {legend}
      </legend>
      <div className="chips">
        {options.map((o) => (
          <label className={value === o ? 'chip on' : 'chip'} key={o}>
            <input type="radio" name={name} value={o} checked={value === o} onChange={onChange} aria-invalid={!!error} />
            <span>{o}</span>
          </label>
        ))}
      </div>
      <Reply text={REPLIES[name][value]} />
      <Err id={`f-${name}`} msg={error} />
    </fieldset>
  );
}

// The card the bot hands over: every question at once, a meter that fills as they're answered, and the send button.
// Once sent it folds down to one line, keeping the answers so "Edit my answers" can open it again.
export function SeatCard({ open, onSend }: { open: boolean; onSend: (v: FormValues) => void }) {
  const [v, setV] = useState<FormValues>(EMPTY);
  const [left, setLeft] = useState<FieldName[]>([]); // text fields the person has typed in and moved on from
  const [greet, setGreet] = useState(''); // first name, once they've moved on from the name field
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const folded = useRef(false);

  // Opened again to edit: start at the top.
  useEffect(() => {
    if (!open) folded.current = true;
    else if (folded.current) formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  }, [open]);

  const isSchool = v.describes === SCHOOL_STUDENT;
  const required = NEEDED.filter(([k]) => k !== 'parentPermission' || isSchool);

  // Checked on every change. The button stays greyed out until nothing is missing.
  const found = validate(v);
  const missing = required.filter(([k]) => found[k]);
  // Before the first tap on the button, only flag a typed answer that's wrong, once the person leaves it; never an empty one.
  const errors: Errors = tried
    ? found
    : Object.fromEntries(left.filter((k) => found[k] && String(v[k]).trim()).map((k) => [k, found[k]]));

  if (!open) {
    return (
      <div className="seat-card folded">
        <span className="meter full" aria-hidden="true">
          {required.map(([k]) => (
            <i key={k} />
          ))}
        </span>
        <span className="mono">{required.length} answers sent</span>
      </div>
    );
  }

  function update<K extends FieldName>(name: K, value: FormValues[K]) {
    setV({ ...v, [name]: value });
  }

  const onText = (e: ChangeEvent<HTMLInputElement>) => update(e.target.name as FieldName, e.target.value);
  const onCheck = (e: ChangeEvent<HTMLInputElement>) => update(e.target.name as FieldName, e.target.checked);
  const onLeave = (e: FocusEvent<HTMLInputElement>) => {
    const name = e.target.name as FieldName;
    if (!left.includes(name)) setLeft([...left, name]);
    if (name === 'name') setGreet(firstName(e.target.value));
  };

  // The greyed-out button still takes a tap: it marks every missing answer and jumps to the first, instead of doing nothing.
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (missing.length) {
      formRef.current?.querySelector<HTMLElement>(`[name="${missing[0][0]}"]`)?.focus();
      return;
    }
    onSend(v);
  }

  const desc = (id: string) => [`${id}-hint`, errors[id.slice(2) as FieldName] && `${id}-err`].filter(Boolean).join(' ');

  return (
    <form ref={formRef} className="seat-card" onSubmit={onSubmit} noValidate aria-labelledby="register-h">
      <p className="card-head mono" style={turn(0)}>
        <span>registration/</span>
        <span>
          {required.length - missing.length} of {required.length}
        </span>
      </p>

      <Ask n={1} id="f-name" label="Your name" hint="as on your name tag" error={errors.name}
        reply={greet && `nice to meet you, ${greet}.`}>
        <input id="f-name" name="name" autoComplete="name" value={v.name} onChange={onText} onBlur={onLeave} maxLength={100}
          aria-invalid={!!errors.name} aria-describedby={desc('f-name')} />
      </Ask>
      <Ask n={2} id="f-whatsapp" label="WhatsApp number" hint="10 digits, +91 optional" error={errors.whatsapp}>
        <input id="f-whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" value={v.whatsapp}
          onChange={onText} onBlur={onLeave} maxLength={20} placeholder="98765 43210"
          aria-invalid={!!errors.whatsapp} aria-describedby={desc('f-whatsapp')} />
      </Ask>
      <Ask n={3} id="f-email" label="Email" hint="for your confirmation" error={errors.email}>
        <input id="f-email" name="email" type="email" inputMode="email" autoComplete="email" value={v.email}
          onChange={onText} onBlur={onLeave} maxLength={150} aria-invalid={!!errors.email} aria-describedby={desc('f-email')} />
      </Ask>

      <Chips n={4} name="describes" legend="Which describes you best?" options={DESCRIBES} value={v.describes}
        error={errors.describes} onChange={onText} />
      <Chips n={5} name="aiExperience" legend="Have you used AI tools before?" options={AI_EXPERIENCE} value={v.aiExperience}
        error={errors.aiExperience} half onChange={onText} />
      <Chips n={6} name="laptop" legend="Will you bring a laptop?" options={LAPTOP} value={v.laptop}
        error={errors.laptop} half onChange={onText} />

      <div className="q" style={turn(7)}>
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

      <div className="card-foot" style={turn(8)}>
        <div className="card-note">
          <span className={missing.length ? 'meter' : 'meter full'} aria-hidden="true">
            {required.map(([k]) => (
              <i key={k} className={found[k] ? undefined : 'on'} />
            ))}
          </span>
          <p className="hint" id="submit-hint">
            {!missing.length
              ? 'all set. free entry, and we only use your details to run kota codes events.'
              : tried
                ? 'a few answers need a look. they’re marked above.'
                : `still needed: ${missing.map(([, label]) => label).join(', ')}`}
          </p>
        </div>
        <button type="submit" className={missing.length ? 'send' : 'send nudge'}
          aria-disabled={missing.length > 0 || undefined} aria-describedby="submit-hint">
          <span>Save my seat</span>
          <Arrow />
        </button>
      </div>
    </form>
  );
}
