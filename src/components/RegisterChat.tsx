import { useEffect, useRef, useState, type FormEvent } from 'react';
import { celebrate } from '../celebrate';
import { CONFIG } from '../config';
import { EVENT, FAQ, SITE } from '../content';
import { cellsToPath } from '../pixel';
import {
  AI_EXPERIENCE,
  DESCRIBES,
  EMPTY,
  LAPTOP,
  SCHOOL_STUDENT,
  firstName,
  normalizePhone,
  submit,
  validate,
  type FormValues,
  type Result,
} from '../registration';
import { Arrow } from './Arrow';
import { Pass } from './Pass';
import { Pixel } from './Pixel';
import { Directions } from './Venue';

// Registration as a chat with the kota.codes bot, laid out like a messaging app: it fills the screen under the site
// header, only the messages scroll, and there's a message box at the bottom. Kept short: name, WhatsApp number and
// email are typed in the message box, then one card takes the rest in a few taps and saves the seat. Typed answers
// can be edited, like a sent message, until then. Nothing here is a language model; the bot's lines are written
// below. It saves the seat through the same Apps Script web app as before (showing each step) and prints a pass.
// After that, the message box takes questions about the day.

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const clock = () => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

const HELLO = 'Hi! I’m the kota.codes bot. Here’s what you’re signing up for:';

// Typed in the message box, in this order: what the bot asks, and the box, so phones show the right keyboard.
type Written = 'name' | 'whatsapp' | 'email';
const BOX: Record<Written, { ask: (v: FormValues) => string; label: string; placeholder: string; type: string; inputMode: 'text' | 'tel' | 'email'; autoComplete: string }> = {
  name: {
    ask: () => 'Seats are limited, so tell me a few things and I’ll hold one for you. First, what’s your name?',
    label: 'Your name', placeholder: 'Type your name', type: 'text', inputMode: 'text', autoComplete: 'name',
  },
  whatsapp: {
    ask: (v) => `Nice to meet you, ${firstName(v.name)}! What’s your WhatsApp number?`,
    label: 'Your WhatsApp number', placeholder: '10-digit number', type: 'tel', inputMode: 'tel', autoComplete: 'tel',
  },
  email: {
    ask: () => 'And your email? I’ll send your confirmation there.',
    label: 'Your email', placeholder: 'you@example.com', type: 'email', inputMode: 'email', autoComplete: 'email',
  },
};
const NEXT: Record<Written, Written | 'card'> = { name: 'whatsapp', whatsapp: 'email', email: 'card' };

// The card takes the rest with a tap each. "Still needed" names what's left, in this order.
type Picked = Pick<FormValues, 'describes' | 'aiExperience' | 'laptop' | 'parentPermission' | 'photoConsent'>;
const NO_PICKS: Picked = { describes: '', aiExperience: '', laptop: '', parentPermission: false, photoConsent: false };
const NEEDED: [keyof Picked, string][] = [
  ['describes', 'what describes you'],
  ['aiExperience', 'ai tools'],
  ['laptop', 'laptop'],
  ['parentPermission', 'parent’s okay'],
  ['photoConsent', 'photo okay'],
];
const CARD = 'Last bit: tap what fits, and I’ll save your seat.';

// The card's answers, sent as the person's message.
const picksLine = (p: Picked) =>
  [
    p.describes === SCHOOL_STUDENT ? `${p.describes}, a parent said yes` : p.describes,
    `AI tools: ${p.aiExperience.toLowerCase()}`,
    `laptop: ${p.laptop.toLowerCase()}`,
    'photos are fine',
  ].join(' · ');

// After signing up, typed questions are matched by keyword and answered from the FAQ where it has one.
const faq = (q: string) => FAQ.find((f) => f.q === q)?.a;
const TOPICS: [RegExp, string | undefined][] = [
  [/friend|dress|wear|prepare/i, faq('Is there a dress code or anything to prepare?')],
  [/when|time|date|start/i, `It’s on ${EVENT.whenText}.`],
  [/where|venue|address|location|reach|direction|map/i, `At ${EVENT.where ?? `${EVENT.city}, venue to be announced`}.`],
  [/bring|laptop|charger/i, faq('What should I bring?')],
  [/free|cost|price|pay|fee|ticket/i, faq('Is it really free?')],
  [/cod(e|ing)|beginner|program/i, faq('I don’t know anything about coding. Can I still come?')],
  [/school|class|parent|\bage\b/i, faq('Can school students come?')],
];
const NOT_SURE = `I’m only a simple bot, so I can’t answer that one. Message us on Instagram, ${SITE.handle}, and a person will get back to you.`;
const QUICK = ['When is it?', 'Where is it?', 'What should I bring?', 'Can I bring a friend?'];

type Answer = { kind: 'result'; result: Result } | { kind: 'failed'; message: string };

async function send(v: FormValues): Promise<Answer> {
  try {
    const result = await submit(v);
    // "closed" means the Settings tab says Registrations open: No. Show it as an outcome, not an error to retry.
    if (result.ok || result.status === 'closed') return { kind: 'result', result };
    return { kind: 'failed', message: result.message || 'Something went wrong on our side. Please try again.' };
  } catch {
    return { kind: 'failed', message: 'We couldn’t send your registration. Check your internet connection and try again.' };
  }
}

// What the bot shows it's doing. The second step waits on the sign-up sheet; the rest follow from its answer.
type Step = { label: string; stop?: boolean };

function planFor(answer?: Answer): Step[] {
  const read = { label: 'reading your answers' };
  if (!answer) return [read, { label: 'saving your seat in the sign-up sheet' }];
  if (answer.kind === 'failed') return [read, { label: 'couldn’t save your seat', stop: true }];
  const email = { label: 'emailing your confirmation' };
  const print = { label: 'printing your pass' };
  switch (answer.result.status) {
    case 'closed':
      return [read, { label: 'registrations are closed', stop: true }];
    case 'duplicate':
      return [read, { label: 'found you on the list already' }, print];
    case 'waitlist':
      return [read, { label: 'seats are full, adding you to the waitlist' }, email, print];
    default:
      return [read, { label: 'saving your seat in the sign-up sheet' }, email, print];
  }
}

const OUTCOME: Record<string, { title: (name: string) => string; body: string; stamp?: string }> = {
  registered: {
    title: (name) => `You’re in, ${name}!`,
    body: 'Your seat is saved. We’ve sent the details to your email too. Snacks and coffee are on us.',
    stamp: 'confirmed',
  },
  duplicate: {
    title: (name) => `You’re already registered, ${name}.`,
    body: 'We already have a signup with this name and WhatsApp number, so there’s nothing more to do. See you there.',
    stamp: 'on the list',
  },
  waitlist: {
    title: (name) => `You’re on the waitlist, ${name}.`,
    body: 'All seats are taken for now. If someone drops out, we’ll message you on WhatsApp and email, in the order people signed up.',
    stamp: 'waitlist',
  },
  closed: {
    title: () => 'Registrations are closed.',
    body: 'We’re not taking new signups for this meetup. Follow us on Instagram, @kota.codes, to hear about the next one.',
  },
};

const PRINT_MS = 1500; // how long the pass takes to come out of the printer; keep in step with .pass in styles.css

// Pixel icons on the same grid as the arrow: a tick, a cross, and a ring of squares that chase each other.
const TICK = cellsToPath(['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....']);
const CROSS = cellsToPath(['##...##', '.##.##.', '..###..', '.##.##.', '##...##']);
const RING = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1]];

function Icon({ path, w, h }: { path: string; w: number; h: number }) {
  return (
    <svg className="ico" viewBox={`0 0 ${w} ${h}`} fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path d={path} />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="ico spin" viewBox="0 0 3 3" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {RING.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="1" height="1" style={{ animationDelay: `${(i - RING.length) * 0.1}s` }} />
      ))}
    </svg>
  );
}

function Steps({ answer, onDone }: { answer?: Answer; onDone: () => void }) {
  const [done, setDone] = useState(0);
  const plan = planFor(answer);
  const finish = useRef(onDone);
  finish.current = onDone;

  useEffect(() => {
    if (done === plan.length) {
      finish.current();
      return;
    }
    if (done === 1 && !answer) return; // still waiting on the sign-up sheet
    const t = setTimeout(() => setDone(done + 1), done === 0 ? 500 : 420);
    return () => clearTimeout(t);
  }, [done, answer, plan.length]);

  return (
    <ol className="steps">
      {plan.slice(0, done + 1).map((s, i) => {
        const state = i < done ? (s.stop ? 'stop' : 'ok') : 'run';
        return (
          <li key={i} className={`step ${state}`}>
            {state === 'run' ? <Spinner /> : state === 'ok' ? <Icon path={TICK} w={7} h={6} /> : <Icon path={CROSS} w={7} h={5} />}
            <span>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

// The bot's first card: the day at a glance, with the palace building itself row by row.
function EventCard() {
  return (
    <div className="event-card">
      <Pixel name="palace" />
      <p className="mono">{EVENT.name.toLowerCase()}</p>
      <p className="event-title">
        Kota’s first AI &amp; tech meetup<span className="sq" aria-hidden="true"></span>
      </p>
      <p className="mono">
        {EVENT.when} / {(EVENT.where ?? EVENT.city).toLowerCase()} / free entry, snacks and coffee
      </p>
      <a className="mono" href="/">
        new here? read about the day, the speakers and the faq
      </a>
    </div>
  );
}

// Link buttons under a message, like a business chat's. The WhatsApp community comes with every result, so nobody
// leaves without a way to stay in touch.
function Links({ which }: { which: 'done' | 'closed' | 'failed' }) {
  return (
    <div className="links">
      {which === 'done' && <p>Screenshot your pass and tag {SITE.handle} on Instagram.</p>}
      {CONFIG.whatsappCommunityUrl && (
        <a href={CONFIG.whatsappCommunityUrl} target="_blank" rel="noopener">
          Join the WhatsApp community <Arrow />
        </a>
      )}
      {which === 'done' && <Directions className="go" />}
      {which === 'closed' && (
        <a href={SITE.instagram} target="_blank" rel="noopener">
          Follow {SITE.handle} <Arrow />
        </a>
      )}
    </div>
  );
}

type ChoiceName = 'describes' | 'aiExperience' | 'laptop';

function Group(props: { legend: string; name: ChoiceName; options: string[]; value: string; onPick: (name: ChoiceName, value: string) => void }) {
  const { legend, name, options, value, onPick } = props;
  return (
    <fieldset className="grp">
      <legend>{legend}</legend>
      <div className="chips">
        {options.map((o) => (
          <label key={o} className={value === o ? 'chip on' : 'chip'}>
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onPick(name, o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// The questions answered with a tap, in one card. The button stays greyed out until they're all done; tapping it
// early lights up what's still needed.
function AskCard({ picked, set, tried, onSave }: { picked: Picked; set: (p: Picked) => void; tried: boolean; onSave: () => void }) {
  const found = validate({ ...EMPTY, ...picked });
  const missing = NEEDED.filter(([k]) => found[k]);
  const pick = (name: ChoiceName, value: string) => set({ ...picked, [name]: value });
  return (
    <div className="ask-card">
      <p>{CARD}</p>
      <Group legend="you are" name="describes" options={DESCRIBES} value={picked.describes} onPick={pick} />
      <Group legend="used ai tools before?" name="aiExperience" options={AI_EXPERIENCE} value={picked.aiExperience} onPick={pick} />
      <Group legend="bringing a laptop?" name="laptop" options={LAPTOP} value={picked.laptop} onPick={pick} />
      {picked.describes === SCHOOL_STUDENT && (
        <label className="tick">
          <input type="checkbox" checked={picked.parentPermission} onChange={(e) => set({ ...picked, parentPermission: e.target.checked })} />
          <span>I’m under 18 and a parent has agreed I can come</span>
        </label>
      )}
      <label className="tick">
        <input type="checkbox" checked={picked.photoConsent} onChange={(e) => set({ ...picked, photoConsent: e.target.checked })} />
        <span>I’m okay with photos and video at the event</span>
      </label>
      <button type="button" className={missing.length ? 'save' : 'save nudge'} aria-disabled={missing.length > 0 || undefined}
        aria-describedby="still" onClick={onSave}>
        <span>Save my seat</span>
        <Arrow />
      </button>
      <p id="still" className={tried && missing.length ? 'still loud' : 'still'}>
        {missing.length
          ? `still needed: ${missing.map(([, label]) => label).join(', ')}`
          : 'all set. free entry, and we only use your details to run kota codes events.'}
      </p>
    </div>
  );
}

type Body =
  | { type: 'text'; text: string; title?: string; field?: Written; edited?: boolean }
  | { type: 'event' }
  | { type: 'card'; sent?: boolean }
  | { type: 'steps'; attempt: number }
  | { type: 'pass'; v: FormValues; stamp: string }
  | { type: 'links'; which: 'done' | 'closed' | 'failed' };
type Msg = { id: number; from: 'bot' | 'you'; time: string; body: Body };
type Ask = { kind: 'write'; field: Written } | { kind: 'card' } | { kind: 'retry' } | { kind: 'chat' } | null;

const line = (text: string, title?: string): Body => ({ type: 'text', text, title });

// One bubble. Only the first of a run from the same side gets a tail. The time sits at the end of the text, with an
// edit button on typed answers while they can still change.
function Message(props: {
  m: Msg;
  tail: boolean;
  answer?: Answer;
  onSaved: (a: Answer) => void;
  card: { picked: Picked; set: (p: Picked) => void; tried: boolean; onSave: () => void };
  onEdit?: (field: Written) => void;
}) {
  const { m, tail, answer, onSaved, card, onEdit } = props;
  const b = m.body;
  const time = (
    <span className="time">
      {b.type === 'text' && b.field && onEdit && (
        <button type="button" className="edit" aria-label={`Edit ${BOX[b.field].label.toLowerCase()}`} onClick={() => onEdit(b.field!)}>
          edit
        </button>
      )}
      {b.type === 'text' && b.edited && 'edited '}
      {m.time}
      {m.from === 'you' && (
        <span className="ticks" aria-hidden="true">
          ✓✓
        </span>
      )}
    </span>
  );
  return (
    <div className={`msg ${m.from}`}>
      <div className={`bubble ${b.type}${tail ? ' tail' : ''}${b.type === 'card' && !b.sent ? ' open' : ''}`}>
        {b.type === 'text' ? (
          <>
            {b.title && <p className="title">{b.title}</p>}
            <p>
              {b.text}
              {time}
            </p>
          </>
        ) : (
          <>
            {b.type === 'event' && <EventCard />}
            {b.type === 'card' && (b.sent ? <p>{CARD}</p> : <AskCard {...card} />)}
            {b.type === 'steps' && <Steps answer={answer} onDone={() => answer && onSaved(answer)} />}
            {b.type === 'pass' && (
              <Pass name={b.v.name.trim()} role={b.v.describes === 'Other' ? 'Anyone curious' : b.v.describes}
                seed={`${b.v.name.trim().toLowerCase()}|${normalizePhone(b.v.whatsapp)}`} stamp={b.stamp} />
            )}
            {b.type === 'links' && <Links which={b.which} />}
            {time}
          </>
        )}
      </div>
    </div>
  );
}

export function RegisterChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(true); // prerendered mid-typing, so the page opens with the bot about to talk
  const [ask, setAsk] = useState<Ask>(null); // what the bot is waiting for
  const [draft, setDraft] = useState('');
  const [picked, setPicked] = useState<Picked>(NO_PICKS);
  const [tried, setTried] = useState(false); // tapped Save with answers missing
  const [editing, setEditing] = useState<Written | null>(null);
  const [locked, setLocked] = useState(false); // saving or saved, so answers can't change
  const [answers, setAnswers] = useState<Record<number, Answer>>({}); // the sign-up sheet's reply to each attempt
  const [asked, setAsked] = useState<string[]>([]); // quick replies already used
  const v = useRef<FormValues>(EMPTY);
  const engaged = useRef(false); // they've answered something, so focus can follow the questions
  const started = useRef(false);
  const ids = useRef(0);
  const attempts = useRef(0);
  const queue = useRef(Promise.resolve());
  const chat = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLInputElement>(null);

  const push = (from: Msg['from'], body: Body) =>
    setMsgs((list) => [...list, { id: ids.current++, from, time: clock(), body }]);

  // The bot says each thing in turn, typing for a moment first. Resolves once it's all out.
  function say(...bodies: Body[]) {
    queue.current = queue.current.then(async () => {
      for (const body of bodies) {
        setTyping(true);
        await sleep(reducedMotion() ? 0 : body.type === 'text' ? Math.min(900, 300 + body.text.length * 8) : 600);
        setTyping(false);
        push('bot', body);
      }
    });
    return queue.current;
  }

  function askFor(next: Written | 'card') {
    setAsk(null);
    if (next === 'card') say({ type: 'card' }).then(() => setAsk({ kind: 'card' }));
    else say(line(BOX[next].ask(v.current))).then(() => setAsk({ kind: 'write', field: next }));
  }

  function onSend(e: FormEvent) {
    e.preventDefault();
    const said = draft.trim();
    const field = editing ?? (ask?.kind === 'write' ? ask.field : null);
    if (!said || (!editing && (typing || !ask || (!field && ask.kind !== 'chat')))) return;
    engaged.current = true;
    setDraft('');
    if (!field) {
      push('you', line(said));
      return reply(said);
    }
    const problem = validate({ ...v.current, [field]: said })[field];
    if (editing) {
      // An edit changes the earlier message in place, like editing a sent message.
      if (problem) {
        setDraft(said);
        say(line(problem));
        return;
      }
      v.current = { ...v.current, [field]: said };
      setMsgs((list) =>
        list.map((m) => (m.body.type === 'text' && m.body.field === field ? { ...m, body: { ...m.body, text: said, edited: true } } : m)),
      );
      setEditing(null);
      return;
    }
    push('you', problem ? line(said) : { type: 'text', text: said, field });
    setAsk(null);
    if (problem) {
      say(line(problem)).then(() => setAsk({ kind: 'write', field }));
      return;
    }
    v.current = { ...v.current, [field]: said };
    askFor(NEXT[field]);
  }

  function edit(field: Written) {
    setEditing(field);
    setDraft(v.current[field]);
  }

  function stopEditing() {
    setEditing(null);
    setDraft('');
  }

  function saveCard() {
    const found = validate({ ...EMPTY, ...picked });
    if (NEEDED.some(([k]) => found[k])) {
      setTried(true);
      return;
    }
    engaged.current = true;
    v.current = { ...v.current, ...picked };
    setMsgs((list) => list.map((m) => (m.body.type === 'card' ? { ...m, body: { type: 'card', sent: true } } : m)));
    push('you', line(picksLine(picked)));
    save();
  }

  async function save() {
    setAsk(null);
    setEditing(null);
    setLocked(true);
    thread.current?.focus({ preventScroll: true }); // the button just tapped goes away; keep focus in the chat
    const id = ++attempts.current;
    await queue.current;
    push('bot', { type: 'steps', attempt: id });
    const answer = await send(v.current);
    setAnswers((a) => ({ ...a, [id]: answer }));
  }

  // Once the steps have played out: the result, then the pass and links, or a way to try again.
  async function saved(answer: Answer) {
    const name = firstName(v.current.name);
    if (answer.kind === 'failed') {
      setLocked(false);
      const links: Body[] = CONFIG.whatsappCommunityUrl ? [{ type: 'links', which: 'failed' }] : [];
      await say(line(answer.message, 'That didn’t go through.'), ...links);
      return setAsk({ kind: 'retry' });
    }
    const { status } = answer.result;
    const o = OUTCOME[status] ?? OUTCOME.registered;
    if (!o.stamp) {
      await say(line(o.body, o.title(name)), { type: 'links', which: 'closed' });
      return setAsk({ kind: 'chat' });
    }
    await say(line(o.body, o.title(name)), { type: 'pass', v: v.current, stamp: o.stamp });
    await sleep(reducedMotion() ? 0 : PRINT_MS);
    if (status === 'registered') celebrate();
    await say({ type: 'links', which: 'done' });
    setAsk({ kind: 'chat' });
  }

  function reply(q: string) {
    setAsk(null);
    const topic = TOPICS.find(([words, a]) => a && words.test(q));
    say(line(topic?.[1] ?? NOT_SURE)).then(() => setAsk({ kind: 'chat' }));
  }

  function retry() {
    push('you', line('Try again'));
    save();
  }

  function quickAsk(q: string) {
    setAsked([...asked, q]);
    push('you', line(q));
    reply(q);
  }

  // Start talking as soon as the page is up. (The ref stops React's development double run from saying it twice.)
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    say(line(HELLO), { type: 'event' }).then(() => askFor('name'));
  }, []);

  // Fill the screen under the site header, like an app, and shrink with the on-screen keyboard so the message box
  // stays in sight.
  useEffect(() => {
    const el = chat.current!;
    const view = window.visualViewport;
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = `${Math.max(320, Math.round((view?.height ?? window.innerHeight) - top))}px`;
    };
    fit();
    view?.addEventListener('resize', fit);
    window.addEventListener('resize', fit);
    return () => {
      view?.removeEventListener('resize', fit);
      window.removeEventListener('resize', fit);
    };
  }, []);

  // The message box is enabled for an edit on the next render, so focus it then.
  useEffect(() => {
    if (editing) box.current?.focus();
  }, [editing]);

  // Keep the newest message in view.
  useEffect(() => {
    const t = thread.current;
    t?.scrollTo({ top: t.scrollHeight, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [msgs.length, typing, ask]);

  // Once someone is answering, focus follows the questions: the message box for typed answers, and with a keyboard
  // and mouse, the card's first choice or Try again. (On a touch screen a focused chip would look already picked.)
  useEffect(() => {
    if (!engaged.current) return;
    if (ask?.kind === 'write') box.current?.focus({ preventScroll: true });
    else if (ask && matchMedia('(pointer: fine)').matches)
      thread.current?.querySelector<HTMLElement>('.ask-card input, .picks button')?.focus({ preventScroll: true });
  }, [ask]);

  const field = editing ?? (ask?.kind === 'write' ? ask.field : null);
  const written = field ? BOX[field] : null;
  const open = !!editing || (!typing && (ask?.kind === 'write' || ask?.kind === 'chat'));
  const quick = QUICK.filter((q) => !asked.includes(q));
  const last = msgs[msgs.length - 1];
  const hint =
    ask?.kind === 'chat' ? 'Ask about the day' : ask?.kind === 'card' ? 'Tap your answers above' : ask?.kind === 'retry' ? 'Tap Try again above' : 'Message';
  const cardProps = { picked, set: setPicked, tried, onSave: saveCard };

  return (
    <div className="chat" ref={chat}>
      <div className="thread" ref={thread} role="log" aria-label="Chat with the kota.codes bot" tabIndex={-1}>
        {msgs.map((m, i) => (
          <Message key={m.id} m={m} tail={i === 0 || msgs[i - 1].from !== m.from}
            answer={m.body.type === 'steps' ? answers[m.body.attempt] : undefined} onSaved={saved} card={cardProps}
            onEdit={locked ? undefined : edit} />
        ))}
        {typing && (
          <div className="msg bot">
            <div className={last?.from === 'bot' ? 'bubble typing' : 'bubble typing tail'}>
              <span className="dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="sr-only">kota.codes is typing</span>
            </div>
          </div>
        )}
        {ask?.kind === 'retry' && !typing && (
          <div className="picks" role="group" aria-label="Your answer">
            <button type="button" onClick={retry}>
              Try again
            </button>
          </div>
        )}
        <noscript>
          <p className="noscript">Registering needs JavaScript. Turn it on and reload, or message us on Instagram, {SITE.handle}.</p>
        </noscript>
      </div>

      <div className="dock">
        {ask?.kind === 'chat' && !typing && quick.length > 0 && (
          <div className="quick" role="group" aria-label="Ask about the day">
            {quick.map((q) => (
              <button key={q} type="button" onClick={() => quickAsk(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        {editing && (
          <p className="editing">
            <span>editing your {BOX[editing].label.replace('Your ', '').toLowerCase()}</span>
            <button type="button" onClick={stopEditing}>
              cancel
            </button>
          </p>
        )}
        <form className="composer" onSubmit={onSend}>
          <label className="sr-only" htmlFor="say">
            {written?.label ?? hint}
          </label>
          <input id="say" ref={box} value={draft} onChange={(e) => setDraft(e.target.value)} disabled={!open}
            type={written?.type ?? 'text'} inputMode={written?.inputMode ?? 'text'} autoComplete={written?.autoComplete ?? 'off'}
            enterKeyHint="send" maxLength={150} placeholder={written?.placeholder ?? hint} />
          <button type="submit" disabled={!open || !draft.trim()} aria-label="Send">
            <Arrow />
          </button>
        </form>
      </div>
    </div>
  );
}
