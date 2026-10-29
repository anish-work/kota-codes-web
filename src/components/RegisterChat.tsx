import { Fragment, useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { celebrate } from '../celebrate';
import { CONFIG } from '../config';
import { EVENT, FAQ, SITE } from '../content';
import { cellsToPath } from '../pixel';
import { SCHOOL_STUDENT, firstName, normalizePhone, submit, type FormValues, type Result } from '../registration';
import { Arrow } from './Arrow';
import { WeaveMark } from './Logo';
import { Pass } from './Pass';
import { SeatCard } from './SeatCard';
import { Typed, reducedMotion } from './Typed';
import { Directions } from './Venue';

// Registration as a chat with the kota.codes bot. Nothing here is a language model: the bot's lines are written
// below and typed out a chunk at a time. It says hello, hands over one card with every question, then saves the seat
// through the same Apps Script web app as before, showing each step, and prints a pass.

const HELLO = `Hi! I’m the kota.codes bot, and I’ll save your seat at ${EVENT.name}.`;
const ASK = 'Everything I need is on this one card. It takes about 30 seconds.';

// wait: typing dots, until the chat is on screen. card: a skeleton for a moment, as if the card is being generated.
type Intro = 'wait' | 'hello' | 'ask' | 'card' | 'ready';
const INTRO: Intro[] = ['wait', 'hello', 'ask', 'card', 'ready'];

type Answer = { kind: 'result'; result: Result } | { kind: 'failed'; message: string };
type Attempt = { id: number; answer?: Answer };

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

// The card's answers, said the way a person would type them.
const ROLE: Record<string, string> = {
  'College student': 'a college student',
  [SCHOOL_STUDENT]: 'a school student, and a parent has said yes',
  'Coaching student': 'a coaching student',
  'Working or freelancing': 'working or freelancing',
  'Business owner': 'a business owner',
  'Teacher or parent': 'a teacher or parent',
};
const AI_SAYS: Record<string, string> = {
  Never: 'I’ve never used AI tools',
  'A few times': 'I’ve tried AI tools a few times',
  Often: 'I use AI tools often',
};
const LAPTOP_SAYS: Record<string, string> = {
  Yes: 'I’ll bring my laptop',
  No: 'I won’t bring a laptop',
  'Phone only': 'I’ll just bring my phone',
};

function say(v: FormValues) {
  const role = ROLE[v.describes];
  const rest = [AI_SAYS[v.aiExperience], LAPTOP_SAYS[v.laptop]].filter(Boolean).join(', and ');
  return [`I’m ${v.name.trim()}${role ? `, ${role}` : ''}.`, rest && `${rest}.`, 'Photos are fine.'].filter(Boolean).join(' ');
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
    title: (name) => `You’re in, ${name}.`,
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

// Offered as quick replies once the pass is out, answered from the FAQ. Matched by question, so rewording one there drops it here.
const QUICK = FAQ.filter((f) =>
  ['What should I bring?', 'I don’t know anything about coding. Can I still come?', 'Is there a dress code or anything to prepare?'].includes(f.q),
);

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

// Bring a new message into view, without moving the page if it's already there.
function reveal(el: Element | null, block: ScrollLogicalPosition = 'nearest') {
  el?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block });
}

function Bot({ children, turnRef }: { children: ReactNode; turnRef?: Ref<HTMLDivElement> }) {
  return (
    <div className="turn bot" ref={turnRef}>
      <p className="from">
        <WeaveMark /> kota.codes
      </p>
      {children}
    </div>
  );
}

function You({ children, turnRef, seen = false }: { children: ReactNode; turnRef?: Ref<HTMLDivElement>; seen?: boolean }) {
  return (
    <div className="turn you" ref={turnRef} tabIndex={-1}>
      <p className="from">you</p>
      <div className="bubble">{children}</div>
      {seen && (
        <p className="seen" aria-hidden="true">
          ✓✓
        </p>
      )}
    </div>
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

// Shown after every submit, whatever the result, so nobody leaves without a way to stay in touch.
function JoinCommunity({ className }: { className: string }) {
  if (!CONFIG.whatsappCommunityUrl) return null;
  return (
    <a className={className} href={CONFIG.whatsappCommunityUrl} target="_blank" rel="noopener">
      Join the WhatsApp community <Arrow />
    </a>
  );
}

function Outcome(props: { answer: Answer; sent: FormValues; onRetry: () => void; onEdit: () => void; onSettled: () => void }) {
  const { answer, sent, onRetry, onEdit } = props;
  const [beat, setBeat] = useState(0); // 0 title, 1 body, 2 printing the pass, 3 everything out
  const head = useRef<HTMLHeadingElement>(null);
  const pass = useRef<HTMLDivElement>(null);
  const acts = useRef<HTMLDivElement>(null);
  const settled = useRef(props.onSettled);
  settled.current = props.onSettled;

  const status = answer.kind === 'failed' ? 'failed' : answer.result.status;
  const o: (typeof OUTCOME)[string] =
    answer.kind === 'failed' ? { title: () => 'That didn’t go through.', body: answer.message } : (OUTCOME[status] ?? OUTCOME.registered);

  useEffect(() => head.current?.focus({ preventScroll: true }), []);

  useEffect(() => {
    if (beat === 2) {
      reveal(pass.current);
      const t = setTimeout(() => setBeat(3), reducedMotion() ? 0 : PRINT_MS);
      return () => clearTimeout(t);
    }
    if (beat === 3) {
      reveal(acts.current);
      settled.current();
      if (status === 'registered') return celebrate();
    }
  }, [beat, status]);

  return (
    <>
      <h3 className="said" ref={head} tabIndex={-1}>
        <Typed text={o.title(firstName(sent.name))} onDone={() => setBeat(1)} />
      </h3>
      {beat >= 1 && (
        <p className="msg">
          <Typed text={o.body} onDone={() => setBeat(o.stamp ? 2 : 3)} />
        </p>
      )}
      {beat >= 2 && o.stamp && (
        <div ref={pass}>
          <Pass name={sent.name.trim()} role={sent.describes === 'Other' ? 'Anyone curious' : sent.describes}
            seed={`${sent.name.trim().toLowerCase()}|${normalizePhone(sent.whatsapp)}`} stamp={o.stamp} />
        </div>
      )}
      {beat >= 3 && (
        <div className="acts" ref={acts}>
          {status === 'failed' ? (
            <>
              <button type="button" className="btn" onClick={onRetry}>
                Try again <Arrow />
              </button>
              <button type="button" className="ghost" onClick={onEdit}>
                Edit my answers
              </button>
              <JoinCommunity className="ghost" />
            </>
          ) : status === 'closed' ? (
            <>
              <JoinCommunity className="btn" />
              <a className="ghost" href={SITE.instagram} target="_blank" rel="noopener">
                Follow {SITE.handle} <Arrow />
              </a>
            </>
          ) : (
            <>
              <JoinCommunity className="btn" />
              <Directions className="ghost" />
              <p className="hint">screenshot your pass and tag {SITE.handle} on instagram</p>
            </>
          )}
        </div>
      )}
    </>
  );
}

export function RegisterChat() {
  const [intro, setIntro] = useState<Intro>('wait');
  const [sent, setSent] = useState<FormValues | null>(null); // the answers in the person's message, once they send the card
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [stepsDone, setStepsDone] = useState(false);
  const [settled, setSettled] = useState(false); // the bot has finished its reply
  const [asked, setAsked] = useState<string[]>([]);
  const [answering, setAnswering] = useState(false);
  const firstTurn = useRef<HTMLDivElement>(null);
  const you = useRef<HTMLDivElement>(null);
  const lastAsked = useRef<HTMLDivElement>(null);
  const sending = useRef(false); // a request is out; a second tap can't send the same seat twice
  const at = INTRO.indexOf(intro);
  const advance = (from: Intro, to: Intro) => () => setIntro((s) => (s === from ? to : s));

  // Start talking once the chat is on screen, so nobody misses the hello. With reduced motion, go straight to the card.
  useEffect(() => {
    if (reducedMotion()) {
      setIntro('ready');
      return;
    }
    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        timer = window.setTimeout(advance('wait', 'hello'), 700);
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(firstTurn.current!);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (intro !== 'card') return;
    const t = setTimeout(advance('card', 'ready'), 550);
    return () => clearTimeout(t);
  }, [intro]);

  // A new attempt: show the person's message at the top of the screen, with the bot's steps under it.
  useEffect(() => {
    if (!attempt) return;
    you.current?.focus({ preventScroll: true });
    reveal(you.current, 'start');
  }, [attempt?.id]);

  useEffect(() => reveal(lastAsked.current, 'start'), [asked.length]);

  function start(values: FormValues) {
    if (sending.current) return;
    sending.current = true;
    const id = (attempt?.id ?? 0) + 1;
    setSent(values);
    setAttempt({ id });
    setStepsDone(false);
    setSettled(false);
    send(values).then((answer) => {
      sending.current = false;
      setAttempt((a) => (a?.id === id ? { id, answer } : a));
    });
  }

  function edit() {
    setSent(null);
    setAttempt(null);
    setStepsDone(false);
    setSettled(false);
  }

  function ask(q: string) {
    setAsked([...asked, q]);
    setAnswering(true);
  }

  const answer = attempt?.answer;
  const passOut = settled && answer?.kind === 'result' && answer.result.status !== 'closed';
  const quick = QUICK.filter((f) => !asked.includes(f.q));
  const busy = intro !== 'ready' || (!!attempt && !settled) || answering;

  return (
    <div className="chat">
      <header className="chat-head">
        <span className={busy ? 'avatar talking' : 'avatar'}>
          <WeaveMark />
        </span>
        <span className="chat-who">
          <strong>kota.codes</strong>
          <span className={busy ? 'status typing' : 'status'}>{busy ? 'typing…' : 'online'}</span>
        </span>
        <span className="chat-tag">bot · meetup #01</span>
      </header>

      <div className="thread" role="log" aria-label="Chat with the kota.codes bot">
        <Bot turnRef={firstTurn}>
          {at === 0 ? (
            <p className="dots">
              <i />
              <i />
              <i />
              <span className="sr-only">kota.codes is typing</span>
            </p>
          ) : (
            <p className="msg">
              <Typed text={HELLO} onDone={advance('hello', 'ask')} />
            </p>
          )}
          {at >= 2 && (
            <p className="msg">
              <Typed text={ASK} onDone={advance('ask', 'card')} />
            </p>
          )}
          {at === 3 && (
            <div className="seat-card skeleton" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
          )}
          {at === 4 && <SeatCard open={!sent} onSend={start} />}
          <noscript>
            <p className="msg">
              Registering needs JavaScript. Turn it on and reload, or message us on Instagram, {SITE.handle}.
            </p>
          </noscript>
        </Bot>

        {sent && (
          <You turnRef={you} seen>
            <p>{say(sent)}</p>
            <p className="contact">
              {normalizePhone(sent.whatsapp)} · {sent.email.trim()}
            </p>
          </You>
        )}

        {attempt && sent && (
          <Bot>
            <Steps key={attempt.id} answer={answer} onDone={() => setStepsDone(true)} />
            {stepsDone && answer && (
              <Outcome key={attempt.id} answer={answer} sent={sent} onRetry={() => start(sent)} onEdit={edit}
                onSettled={() => setSettled(true)} />
            )}
          </Bot>
        )}

        {passOut &&
          asked.map((q, i) => (
            <Fragment key={q}>
              <You turnRef={i === asked.length - 1 ? lastAsked : undefined}>
                <p>{q}</p>
              </You>
              <Bot>
                <p className="msg">
                  <Typed text={FAQ.find((f) => f.q === q)!.a} onDone={i === asked.length - 1 ? () => setAnswering(false) : undefined} />
                </p>
              </Bot>
            </Fragment>
          ))}

        {passOut && !answering && quick.length > 0 && (
          <div className="quick">
            <p className="from">ask me</p>
            {quick.map((f) => (
              <button key={f.q} type="button" onClick={() => ask(f.q)}>
                {f.q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
