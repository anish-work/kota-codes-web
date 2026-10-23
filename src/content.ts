// Single source of truth for page copy and event facts.
// The page, the JSON-LD structured data and the meta tags all read from here.

export const SITE = {
  url: 'https://kota.codes',
  name: 'Kota Codes',
  instagram: 'https://www.instagram.com/kota.codes/',
  handle: '@kota.codes',
};

export const EVENT = {
  name: 'Kota Codes Meetup #01',
  headline: 'Kota’s first AI & tech meetup',
  description:
    'A free, friendly morning to learn what AI really is, try it yourself, and meet people in Kota who are curious about technology. No coding knowledge needed.',
  start: '2026-11-01T10:30:00+05:30',
  end: '2026-11-01T13:30:00+05:30',
  dateLabel: 'sunday, 1 november',
  timeLabel: '10:30 am – 1:30 pm',
  city: 'Kota',
  region: 'Rajasthan',
  venue: null as string | null, // set when announced
};

export const WHO = [
  { title: 'College students', note: 'Any course, any year' },
  { title: 'School students', note: 'Class 9 to 12, with a parent’s permission' },
  { title: 'Working people and freelancers', note: 'Learn to save time with AI at work' },
  { title: 'Shop and business owners', note: 'See what AI can do for your business' },
  { title: 'Teachers and parents', note: 'Understand the tools your students and children use' },
  { title: 'Anyone curious', note: 'If you’ve ever wondered how AI works, come' },
];

export type Slot = { time: string; title: string; note?: string };

export const SCHEDULE: { part: string; slots: Slot[] }[] = [
  {
    part: 'The morning',
    slots: [
      { time: '10:30 am', title: 'Arrive, have chai and say hello', note: 'Pick up your name tag and meet the people around you.' },
      { time: '10:45 am', title: 'Welcome', note: 'Who we are, and why Kota needs a place for people who love tech.' },
      { time: '10:55 am', title: 'AI: myth or fact?', note: 'A fun game about things people fear about AI, like “Will it take my job?” You vote, then live demos show the answer.' },
      { time: '11:10 am', title: 'Talk by Dev', note: 'CTO at Gooey.AI. Topic to be announced.' },
      { time: '11:30 am', title: 'Talk by Millind', note: 'Software Developer at Gooey.AI. Topic to be announced.' },
      { time: '11:45 am', title: 'Short break' },
    ],
  },
  {
    part: 'After the break',
    slots: [
      { time: '11:55 am', title: 'Try AI yourself', note: 'A guided session on your phone or laptop. Complete beginners and people who already code sit in separate groups, with helpers at every table.' },
      { time: '12:35 pm', title: 'Kota stories', note: 'People from Kota share how they use technology in their study, work or business.' },
      { time: '12:50 pm', title: 'Join the community', note: 'How to stay in touch and hear about the next meetups.' },
      { time: '1:00 pm', title: 'Lunch and chat', note: 'Eat, talk and make some new friends.' },
      { time: '1:30 pm', title: 'Wrap up' },
    ],
  },
];

export const TAKEAWAYS = [
  'A clear idea of what AI really is, and what it isn’t',
  'Simple AI tools you can use for study, work or business the very next day',
  'New friends in Kota who are interested in the same things',
  'A place to keep learning, with more meetups to come',
];

export const SPEAKERS = [
  { name: 'Dev', org: 'Gooey.AI', role: 'CTO', topic: 'topic soon' },
  { name: 'Millind', org: 'Gooey.AI', role: 'Software Developer', topic: 'topic soon' },
];

export const FAQ = [
  { q: 'Is it really free?', a: 'Yes. Entry is free, and chai, snacks and lunch are on us. We only ask you to register so we know how many people are coming.' },
  { q: 'I don’t know anything about coding. Can I still come?', a: 'Yes, please do. Most of the morning is for people who are new to AI and tech. Everything is explained simply, and you can ask anything.' },
  { q: 'What should I bring?', a: 'Your phone is enough. If you have a laptop, bring it along with a charger.' },
  { q: 'Can school students come?', a: 'Yes, from Class 9 upwards, with a parent’s permission. Parents are welcome to come too.' },
  { q: 'Where exactly is it?', a: 'The venue in Kota will be announced soon on our Instagram, @kota.codes, and shared with everyone who registers.' },
  { q: 'Is there a dress code or anything to prepare?', a: 'No. Come as you are, and bring a friend if you like.' },
];
