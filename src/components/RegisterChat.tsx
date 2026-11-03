import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
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
// header, only the messages scroll, and you answer in the message box at the bottom or with the reply buttons under a
// question. Nothing here is a language model; the bot's lines are written below. It asks one thing at a time, shows a
// summary to check, saves the seat through the same Apps Script web app as before (showing each step) and prints a
// pass. After that, the message box takes questions about the day.

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const clock = () => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

const HELLO = 'Hi! I’m the kota.codes bot. Here’s what you’re signing up for:';
const FEW = 'Seats are limited, so I’ll ask you a few quick things and hold one for you. It takes about 30 seconds.';

// The questions, in the order they're asked. A parent's okay is only asked of school students.
const ORDER = ['name', 'whatsapp', 'email', 'describes', 'parentPermission', 'aiExperience', 'laptop', 'photoConsent'] as const;
type Field = (typeof ORDER)[number];
type Written = 'name' | 'whatsapp' | 'email'; // answered in the message box; the rest with reply buttons
type Choice = Exclude<Field, Written> | 'confirm' | 'change' | 'retry';

const QUESTION: Record<Field, string> = {
  name: 'First, what’s your name? Write it the way you’d like it on your name tag.',
  whatsapp: 'What’s your WhatsApp number?',
  email: 'And your email? I’ll send your confirmation there.',
  describes: 'Which of these describes you best?',
  parentPermission: 'Since you’re in school, a parent needs to say yes. Has a parent agreed you can come?',
  aiExperience: 'Have you used AI tools before?',
  laptop: 'Will you bring a laptop?',
  photoConsent: 'Last one: we take photos and video at the event. Is that okay with you?',
};
// Asked instead when someone goes back to change an answer.
const AGAIN: Partial<Record<Field, string>> = {
  name: 'What should I put on your name tag?',
  whatsapp: 'What’s the right WhatsApp number?',
  email: 'What’s the right email?',
};

// The message box for each typed answer, so phones show the right keyboard and can fill it in.
const BOX: Record<Written, { label: string; placeholder: string; type: string; inputMode: 'text' | 'tel' | 'email'; autoComplete: string }> = {
  name: { label: 'Your name', placeholder: 'Type your name', type: 'text', inputMode: 'text', autoComplete: 'name' },
  whatsapp: { label: 'Your WhatsApp number', placeholder: '10-digit number', type: 'tel', inputMode: 'tel', autoComplete: 'tel' },
  email: { label: 'Your email', placeholder: 'you@example.com', type: 'email', inputMode: 'email', autoComplete: 'email' },
};

const PARENT_YES = 'Yes, a parent has agreed';
const PHOTOS_OK = 'Yes, that’s fine';
const CHANGE = 'Change something';
const NEVER_MIND = 'Never mind';
// What each "Change something" option asks again.
const CHANGES: Record<string, Field> = {
  Name: 'name',
  'WhatsApp number': 'whatsapp',
  Email: 'email',
  'What describes me': 'describes',
  'AI tools': 'aiExperience',
  Laptop: 'laptop',
};

const OPTIONS: Record<Choice, string[]> = {
  describes: DESCRIBES,
  parentPermission: [PARENT_YES, 'Not yet'],
  aiExperience: AI_EXPERIENCE,
  laptop: LAPTOP,
  photoConsent: [PHOTOS_OK, 'I’d rather not'],
  confirm: ['Save my seat', CHANGE],
  change: [...Object.keys(CHANGES), NEVER_MIND],
  retry: ['Try again', CHANGE],
};

// The bot's one-line reply to a choice, before its next question.
const REPLIES: Partial<Record<Field, Record<string, string>>> = {
  describes: {
    'College student': 'Nice. Any course, any year is welcome.',
    [SCHOOL_STUDENT]: 'Welcome!',
    'Coaching student': 'A morning off from the books. You’ve earned it.',
    'Working or freelancing': 'You’ll leave with ways to save time with AI at work.',
    'Business owner': 'You’ll see what AI can do for your business.',
    'Teacher or parent': 'You’ll get to know the tools your students and children use.',
    Other: 'Curious is all you need.',
  },
  aiExperience: {
    Never: 'Perfect, the morning is made for you.',
    'A few times': 'Nice. You’ll try a lot more on the day.',
    Often: 'Great. You’ll still pick up new tricks.',
  },
  laptop: {
    Yes: 'Great, bring the charger too.',
    No: 'No problem, your phone is enough.',
    'Phone only': 'That works, your phone is enough.',
  },
};

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

function Summary({ v }: { v: FormValues }) {
  const rows = [
    ['name', v.name.trim()],
    ['whatsapp', normalizePhone(v.whatsapp) ?? v.whatsapp],
    ['email', v.email.trim()],
    ['you’re', v.describes === SCHOOL_STUDENT ? `${v.describes}, a parent said yes` : v.describes],
    ['ai tools', v.aiExperience],
    ['laptop', v.laptop],
    ['photos', 'okay'],
  ];
  return (
    <dl className="summary">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
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

type Body =
  | { type: 'text'; text: string; title?: string }
  | { type: 'event' }
  | { type: 'summary'; v: FormValues }
  | { type: 'steps'; attempt: number }
  | { type: 'pass'; v: FormValues; stamp: string }
  | { type: 'links'; which: 'done' | 'closed' | 'failed' };
type Msg = { id: number; from: 'bot' | 'you'; time: string; body: Body };
type Ask = { kind: 'write'; field: Written } | { kind: 'choose'; key: Choice } | { kind: 'chat' } | null;

const line = (text: string, title?: string): Body => ({ type: 'text', text, title });

// One bubble. Only the first of a run from the same side gets a tail. The time sits at the end of the text.
function Message({ m, tail, answer, onSaved }: { m: Msg; tail: boolean; answer?: Answer; onSaved: (a: Answer) => void }) {
  const b = m.body;
  const time = (
    <span className="time">
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
      <div className={tail ? `bubble ${b.type} tail` : `bubble ${b.type}`}>
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
            {b.type === 'summary' && <Summary v={b.v} />}
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
  const [answers, setAnswers] = useState<Record<number, Answer>>({}); // the sign-up sheet's reply to each attempt
  const [asked, setAsked] = useState<string[]>([]); // quick replies already used
  const v = useRef<FormValues>(EMPTY);
  const editing = useRef(false); // changing one answer from the summary
  const engaged = useRef(false); // they've answered something, so focus can follow the questions
  const started = useRef(false);
  const ids = useRef(0);
  const attempts = useRef(0);
  const queue = useRef(Promise.resolve());
  const chat = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLInputElement>(null);
  const picks = useRef<HTMLDivElement>(null);

  const push = (from: Msg['from'], body: Body) =>
    setMsgs((list) => [...list, { id: ids.current++, from, time: clock(), body }]);

  // The bot says each thing in turn, typing for a moment first. Resolves once it's all out, for the next ask.
  function say(...bodies: Body[]) {
    setAsk(null);
    queue.current = queue.current.then(async () => {
      for (const body of bodies) {
        setTyping(true);
        await sleep(reducedMotion() ? 0 : body.type === 'text' ? Math.min(1400, 400 + body.text.length * 12) : 800);
        setTyping(false);
        push('bot', body);
      }
    });
    return queue.current;
  }

  const choose = (key: Choice) => setAsk({ kind: 'choose', key });

  function askFor(field: Field | 'summary', ...lead: Body[]) {
    if (field === 'summary') {
      editing.current = false;
      say(...lead, line('Here’s what I’ve got. Shall I save your seat?'), { type: 'summary', v: v.current }).then(() => choose('confirm'));
      return;
    }
    const q =
      (editing.current && AGAIN[field]) ||
      (field === 'whatsapp' ? `Nice to meet you, ${firstName(v.current.name)}! ${QUESTION.whatsapp}` : QUESTION[field]);
    say(...lead, line(q)).then(() =>
      field === 'name' || field === 'whatsapp' || field === 'email' ? setAsk({ kind: 'write', field }) : choose(field),
    );
  }

  // After an answer: the next question, or back to the summary when it was a change.
  function next(after: Field, ...lead: Body[]) {
    const school = v.current.describes === SCHOOL_STUDENT;
    if (after === 'describes' && school && !v.current.parentPermission) return askFor('parentPermission', ...lead);
    if (editing.current) return askFor('summary', ...lead);
    const rest = ORDER.slice(ORDER.indexOf(after) + 1).filter((f) => f !== 'parentPermission' || school);
    askFor(rest[0] ?? 'summary', ...lead);
  }

  function onSend(e: FormEvent) {
    e.preventDefault();
    const said = draft.trim();
    if (!said || typing || !ask || ask.kind === 'choose') return;
    engaged.current = true;
    setDraft('');
    push('you', line(said));
    if (ask.kind === 'chat') return reply(said);
    const { field } = ask;
    const problem = validate({ ...v.current, [field]: said })[field];
    if (problem) {
      say(line(problem)).then(() => setAsk({ kind: 'write', field }));
      return;
    }
    v.current = { ...v.current, [field]: said };
    next(field);
  }

  function pick(option: string) {
    if (ask?.kind !== 'choose') return;
    const { key } = ask;
    engaged.current = true;
    push('you', line(option));
    switch (key) {
      case 'describes':
      case 'aiExperience':
      case 'laptop': {
        v.current = { ...v.current, [key]: option };
        const said = REPLIES[key]?.[option];
        return next(key, ...(said ? [line(said)] : []));
      }
      case 'parentPermission':
        if (option !== PARENT_YES) {
          say(line('No problem. Check with a parent first, then tap yes.')).then(() => choose(key));
          return;
        }
        v.current = { ...v.current, parentPermission: true };
        return next(key, line('Thanks!'));
      case 'photoConsent':
        if (option !== PHOTOS_OK) {
          say(line('I understand. We need everyone’s okay for photos to save a seat, so I can’t register you without it. If you change your mind, tap yes.')).then(() => choose(key));
          return;
        }
        v.current = { ...v.current, photoConsent: true };
        return next(key);
      case 'change':
        if (option === NEVER_MIND) return askFor('summary');
        editing.current = true;
        return askFor(CHANGES[option], line('Sure.'));
      default: // the summary's buttons, or Try again after an error
        if (option === CHANGE) {
          say(line('Sure. What would you like to change?')).then(() => choose('change'));
          return;
        }
        save();
    }
  }

  async function save() {
    setAsk(null);
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
      const links: Body[] = CONFIG.whatsappCommunityUrl ? [{ type: 'links', which: 'failed' }] : [];
      await say(line(answer.message, 'That didn’t go through.'), ...links);
      return choose('retry');
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
    const topic = TOPICS.find(([words, a]) => a && words.test(q));
    say(line(topic?.[1] ?? NOT_SURE)).then(() => setAsk({ kind: 'chat' }));
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
    say(line(HELLO), { type: 'event' }, line(FEW)).then(() => askFor('name'));
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

  // Keep the newest message in view.
  useEffect(() => {
    const t = thread.current;
    t?.scrollTo({ top: t.scrollHeight, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [msgs.length, typing, ask]);

  // Once someone is answering, focus follows the questions: the message box for typed answers, else the first button.
  useEffect(() => {
    if (!engaged.current) return;
    if (ask?.kind === 'write') box.current?.focus({ preventScroll: true });
    else if (ask?.kind === 'choose') picks.current?.querySelector('button')?.focus({ preventScroll: true });
  }, [ask]);

  const written = ask?.kind === 'write' ? BOX[ask.field] : null;
  const open = !typing && (ask?.kind === 'write' || ask?.kind === 'chat');
  const options = ask?.kind === 'choose' ? OPTIONS[ask.key] : [];
  // Short answers share a row; long ones get a row each.
  const cols = options.length <= 3 && options.every((o) => o.length <= 12) ? options.length : options.some((o) => o.length > 18) ? 1 : 2;
  const quick = QUICK.filter((q) => !asked.includes(q));
  const last = msgs[msgs.length - 1];

  return (
    <div className="chat" ref={chat}>
      <div className="thread" ref={thread} role="log" aria-label="Chat with the kota.codes bot" tabIndex={-1}>
        {msgs.map((m, i) => (
          <Message key={m.id} m={m} tail={i === 0 || msgs[i - 1].from !== m.from}
            answer={m.body.type === 'steps' ? answers[m.body.attempt] : undefined} onSaved={saved} />
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
        {options.length > 0 && !typing && (
          <div className="picks" ref={picks} role="group" aria-label="Your answer" style={{ '--cols': cols } as CSSProperties}>
            {options.map((o) => (
              <button key={o} type="button" onClick={() => pick(o)}>
                {o}
              </button>
            ))}
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
        <form className="composer" onSubmit={onSend}>
          <label className="sr-only" htmlFor="say">
            {written?.label ?? (ask?.kind === 'chat' ? 'Ask about the day' : 'Message')}
          </label>
          <input id="say" ref={box} value={draft} onChange={(e) => setDraft(e.target.value)} disabled={!open}
            type={written?.type ?? 'text'} inputMode={written?.inputMode ?? 'text'} autoComplete={written?.autoComplete ?? 'off'}
            enterKeyHint="send" maxLength={150}
            placeholder={written?.placeholder ?? (ask?.kind === 'chat' ? 'Ask about the day' : ask?.kind === 'choose' ? 'Tap an answer above' : 'Message')} />
          <button type="submit" disabled={!open || !draft.trim()} aria-label="Send">
            <Arrow />
          </button>
        </form>
      </div>
    </div>
  );
}
