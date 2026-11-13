// Single source of truth for page copy and facts.
// The pages, the head tags (scripts/prerender.js) and the JSON-LD structured data all read from here.

import devPhoto from './photos/dev.webp';
import milindPhoto from './photos/milind.webp';

export const SITE = {
  url: 'https://kota.codes',
  name: 'Kota Codes',
  instagram: 'https://www.instagram.com/kota.codes/',
  handle: '@kota.codes',
  tagline: 'Kota’s AI & tech community',
  motto: 'Learn tech. Meet people.',
};

// The black bar at the top of every page.
export const STATUS = ['meetup 01 done', '65 people came', 'meetup 02 coming soon'];

// Head tags for each page. scripts/prerender.js writes them into a copy of index.html per page.
export const PAGES = {
  home: {
    path: '/',
    title: 'Kota Codes · Kota’s AI & tech community',
    description:
      'Kota Codes is Kota’s AI & tech community: meetups for anyone in Kota who is curious about AI and technology. No coding needed. Meetup 02 is coming soon.',
  },
  meetup: {
    path: '/meetup-01',
    title: 'Meetup 01 · Kota Codes',
    description:
      'How Kota Codes Meetup 01 went: 65 people at iStart Nest, Kota, talks by Dev and Milind of Gooey.AI, and an AI agent built live on Gooey.AI.',
  },
  register: {
    path: '/register',
    title: 'Meetup 01 registration is closed · Kota Codes',
    description: 'Registration for Kota Codes Meetup 01 is closed. Follow @kota.codes on Instagram to hear about Meetup 02 first.',
    robots: 'noindex, follow', // nothing to sign up for, so keep it out of search
  },
} satisfies Record<string, { path: string; title: string; description: string; robots?: string }>;

export const MEETUP_01 = {
  name: 'Kota Codes Meetup 01',
  description:
    'Kota Codes’ first meetup: a free morning with talks by Dev and Milind of Gooey.AI, a spot-the-AI game, and a hands-on session building an AI agent live on Gooey.AI.',
  start: '2026-11-07T10:30:00+05:30',
  end: '2026-11-07T13:30:00+05:30',
  date: 'Saturday 7 November 2026',
  day: ['Saturday,', '7 November'], // the-day/ side panel, on two lines
  time: '10:30 am – 1:30 pm',
  venue: 'iStart Nest',
  city: 'Kota',
  region: 'Rajasthan',
  where: 'iStart Nest, Kota',
  mapsUrl: 'https://maps.app.goo.gl/NSXd63qb7DHGtfF77',
};

// about/: the woven mark beside three numbers.
export const FACTS = [
  ['65', 'people at meetup 01'],
  ['5–6', 'projects shown by people from kota'],
  ['0', 'coding needed'],
];

// meetup-01/ on the home page: the day in five lines, then a link to /meetup-01.
export const RECAP = [
  'Meetup 01 was on Saturday 7 November 2026 at iStart Nest, Kota.',
  '65 people came.',
  'Dev and Milind from Gooey.AI gave talks, and we built an AI agent together, live on Gooey.AI.',
  '5–6 people from the audience showed their own projects.',
  'Lots of people asked when the next one is.',
];

// whats-next/: say only what's confirmed.
export const NEXT = [
  {
    title: 'More meetups',
    text: 'Meetup 02 is coming soon. We’ll announce the date and venue on Instagram, at @kota.codes.',
    status: 'meetup 02 / date and venue to be announced',
  },
  {
    title: 'AI Cohorts',
    planned: true,
    text: 'Free, 10-week, project-based programs that take young people in Kota from their first prompt to their first paid work.',
    status: 'planned / no dates yet',
  },
];

export const WHO = [
  { title: 'College students', note: 'Any course, any year' },
  { title: 'School students', note: 'Class 9 to 12, with a parent’s permission' },
  { title: 'Working people and freelancers', note: 'Learn to save time with AI at work' },
  { title: 'Shop and business owners', note: 'See what AI can do for your business' },
  { title: 'Teachers and parents', note: 'Understand the tools your students and children use' },
  { title: 'Anyone curious', note: 'If you’ve ever wondered how AI works, you’re welcome' },
];

// how-it-went/ on /meetup-01. Numbers first, then the twist and the thank-yous.
export const WENT = [
  ['65', 'people came.'],
  ['5–6', 'people from the audience showed their own projects.'],
  ['lots', 'of people asked when the next one is.'],
];
export const TWIST = 'In the spot-the-AI game, the “Which one is AI?” round had a twist: all four pictures were real.';
export const THANKS =
  'Thanks to iStart Nest for the hall and for inviting their founder network, to Dev and Milind, and to everyone who helped on the day.';

export const SPEAKERS = [
  {
    name: 'Dev',
    org: 'Gooey.AI',
    role: 'CTO',
    time: '11:10 am',
    talk: 'How I built Gooey.AI for millions of users, from Kota',
    photo: devPhoto,
  },
  {
    name: 'Milind',
    org: 'Gooey.AI',
    role: 'Software Developer',
    time: '11:30 am',
    talk: 'How do we make AI’s energy cost visible before it’s too late?',
    photo: milindPhoto,
  },
];

// photos/ on /meetup-01: the group photo first, then the grid in the order shown, then the lightbox in the same order.
// Files are in src/photos/meetup-01/: "<id>-640.webp" for the grid, "<id>-1800.webp" (long edge 1800) for the lightbox,
// "<id>.mp4" for videos (720p H.264, poster from its first second). Made from the originals with EXIF and location data
// removed. Captions say only what the picture shows.
const media = import.meta.glob<string>('./photos/meetup-01/*.{webp,mp4}', { eager: true, import: 'default' });
const file = (name: string) => {
  const url = media[`./photos/meetup-01/${name}`];
  if (!url) throw new Error(`missing src/photos/meetup-01/${name}`);
  return url;
};

export type Shot = {
  id: string;
  alt: string;
  caption: string;
  thumb: string; // grid image
  full: string; // lightbox image (a video's poster)
  w: number; // full's size
  h: number;
  video?: string;
  length?: string; // "0:11"
  wide?: boolean; // spans two grid columns
};

const photo = (id: string, alt: string, caption: string, wide = false): Shot => ({
  id, alt, caption, wide, thumb: file(`${id}-640.webp`), full: file(`${id}-1800.webp`), w: 1350, h: 1800,
});
const clip = (id: string, alt: string, caption: string, length: string): Shot => ({
  id, alt, caption, length, thumb: file(`${id}-640.webp`), full: file(`${id}-1800.webp`), w: 720, h: 1280, video: file(`${id}.mp4`),
});

export const GALLERY: Shot[] = [
  {
    id: 'group',
    alt: 'The Meetup 01 group photo, everyone standing on the stage at iStart Nest',
    caption: 'The group photo at iStart Nest.',
    thumb: file('group-1280.webp'),
    full: file('group-2400.webp'),
    w: 2400,
    h: 1800,
  },
  photo(
    'welcome-screen',
    'The big screen before the start: Kota’s first AI & tech meetup, we start at 10:45, say hello to someone new',
    'Before the start: “We start at 10:45. Say hello to someone new.”',
  ),
  photo('welcome-slide', 'A speaker beside the slide “Kota already knows how to learn”', 'From the welcome: “Kota already knows how to learn.”'),
  photo('istart', 'A speaker beside a slide of iStart Rajasthan’s website and social links', 'iStart Rajasthan’s links on the screen.'),
  photo('hall', 'People in the blue seats of the hall, watching the stage', 'The hall at iStart Nest.'),
  clip('hall-pan', 'Video: from the seats to the stage, 11:25 am', 'From the seats to the stage, 11:25 am.', '0:11'),
  photo('stage', 'Two people on the stage in front of the big screen', 'On stage, by the big screen.'),
  photo('laptop', 'A speaker at the laptop on the stage', 'At the laptop on stage.'),
  clip('stage-pan', 'Video: from the stage to the seats, 12:00 pm', 'From the stage to the seats, 12:00 pm.', '0:15'),
  photo('speaker', 'A speaker on the stage; the screen behind shows 12:37', 'Speaking to the room, 12:37 pm.'),
  photo('snacks', 'Silver plates of chips and samosas on a table', 'Snacks on the table.', true),
  photo('chips', 'Two jars of Snackupp chips: quinoa cream & onion, and ragi spicy crunch', 'Quinoa and ragi chips from Snackupp.'),
];

export type Slot = { time: string; title: string; note?: string; pix?: 'bell' };

// The run of the day from the brief, told after the fact.
export const SCHEDULE: { part: string; slots: Slot[] }[] = [
  {
    part: 'The morning',
    slots: [
      { time: '10:30 am', title: 'Coffee and hellos', note: 'People arrived, grabbed a coffee and met the people around them.' },
      { time: '10:45 am', title: 'Welcome', note: 'Who we are, and why Kota needs a place for people who love tech.' },
      {
        time: '10:55 am',
        title: 'AI: myth or fact?',
        note: 'A game about spotting AI. Everyone voted on which picture was made by AI. In the “Which one is AI?” round, all four pictures were real.',
      },
      { time: '11:10 am', title: 'Talk by Dev', note: `CTO at Gooey.AI. “${SPEAKERS[0].talk}”` },
      { time: '11:30 am', title: 'Talk by Milind', note: `Software Developer at Gooey.AI. “${SPEAKERS[1].talk}”` },
      { time: '11:45 am', title: 'Short break' },
    ],
  },
  {
    part: 'After the break',
    slots: [
      { time: '11:55 am', title: 'Build an AI agent', note: 'The hands-on session. We built an AI agent together, live on Gooey.AI.' },
      { time: '12:35 pm', title: 'Kota stories', note: 'People from Kota shared how they use technology in their study, work or business.', pix: 'bell' },
      { time: '12:50 pm', title: 'Join the community', note: 'How to stay in touch and hear about the next meetups.' },
      { time: '1:00 pm', title: 'Snacks and chat', note: 'Time to eat, talk and meet new people.' },
      { time: '1:30 pm', title: 'Wrap up' },
    ],
  },
];
