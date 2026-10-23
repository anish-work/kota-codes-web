/**
 * Kota Codes Meetup #01: registration backend.
 *
 * Google Apps Script web app, bound to the registrations Sheet.
 * The website POSTs JSON (as text/plain) here; each valid signup becomes one row.
 * Responds with JSON: { ok, status, message }, where status is
 * "registered" | "waitlist" | "duplicate" | "invalid" | "busy" | "error".
 *
 * After ANY change to this file: Deploy > Manage deployments > edit (pencil) >
 * Version: New version > Deploy. The live URL keeps running the old version until you do.
 */

// Seats available. Once this many rows have status "registered", new signups go on the waitlist.
const MAX_SEATS = 120;

const SHEET_NAME = 'Registrations';

// Shown in confirmation emails. Keep in sync with src/config.ts on the website.
const EVENT = {
  name: 'Kota Codes Meetup #01',
  date: 'Sunday, 1 November 2026',
  time: '10:30 am – 1:30 pm',
  venue: 'In Kota, to be announced. We’ll email you and post it on Instagram (@kota.codes).',
  mapsUrl: '',
  whatToBring: 'Your phone. A laptop and charger if you have one.',
  whatsappGroupUrl: '',
  instagram: 'https://www.instagram.com/kota.codes/',
};

const HEADERS = [
  'Timestamp', 'Status', 'Full name', 'WhatsApp', 'Email', 'Describes you',
  'College/school/workplace', 'AI experience', 'Laptop', 'Wants to learn',
  'Heard from', 'Parent permission', 'Photo consent',
];

// Same option labels as the website (src/registration.ts).
const SCHOOL_STUDENT = 'School student (Class 9+)';
const OPTIONS = {
  describes: ['College student', SCHOOL_STUDENT, 'Coaching student', 'Working or freelancing', 'Business owner', 'Teacher or parent', 'Other'],
  aiExperience: ['Never', 'A few times', 'Often'],
  laptop: ['Yes', 'No', 'Phone only'],
  heardFrom: ['', 'Instagram', 'WhatsApp', 'A friend', 'College', 'iStart Nest', 'Other'],
};

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply(false, 'invalid', 'We couldn’t read that registration. Please try again.');
  }

  // Honeypot: real people never see this field. Pretend it worked and drop it.
  if (str(data.website)) return reply(true, 'registered', 'You’re in.');

  const v = clean(data);
  const problem = validate(v);
  if (problem) return reply(false, 'invalid', problem);

  // One signup at a time, so seat counts and duplicate checks can't race.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return reply(false, 'busy', 'Lots of people are registering right now. Please try again in a minute.');
  }

  let status;
  try {
    const sheet = getSheet();
    const last = sheet.getLastRow();
    const rows = last > 1 ? sheet.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];

    const key = dupKey(v.name, v.whatsapp);
    if (rows.some(function (r) { return dupKey(r[2], r[3]) === key; })) {
      return reply(true, 'duplicate', 'You’re already registered.');
    }

    const seated = rows.filter(function (r) { return r[1] === 'registered'; }).length;
    status = seated < MAX_SEATS ? 'registered' : 'waitlist';

    sheet.appendRow([
      new Date(), status, v.name, v.whatsapp, v.email, v.describes, v.org,
      v.aiExperience, v.laptop, v.learn, v.heardFrom,
      v.describes === SCHOOL_STUDENT ? (v.parentPermission ? 'Yes' : 'No') : '',
      'Yes',
    ].map(safeCell));
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  // Email outside the lock. A failed email shouldn't undo a saved seat.
  try {
    sendConfirmation(v, status);
  } catch (err) {
    console.error('Email failed for ' + v.email + ': ' + err);
  }

  return status === 'registered'
    ? reply(true, 'registered', 'You’re in.')
    : reply(true, 'waitlist', 'You’re on the waitlist.');
}

// Visiting the URL in a browser is a quick check that the deployment works.
function doGet() {
  return reply(true, 'ready', 'Kota Codes registration is running.');
}

// ---------------------------------------------------------------------------

function clean(d) {
  return {
    name: str(d.name).replace(/\s+/g, ' ').slice(0, 100),
    whatsapp: normalizePhone(str(d.whatsapp)),
    email: str(d.email).toLowerCase().slice(0, 150),
    describes: str(d.describes),
    org: str(d.org).slice(0, 150),
    aiExperience: str(d.aiExperience),
    laptop: str(d.laptop),
    learn: str(d.learn).slice(0, 1000),
    heardFrom: str(d.heardFrom),
    parentPermission: d.parentPermission === true,
    photoConsent: d.photoConsent === true,
  };
}

function validate(v) {
  if (!v.name) return 'Please tell us your name.';
  if (!v.whatsapp) return 'Please add a 10-digit Indian WhatsApp number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) return 'Please add a valid email.';
  if (OPTIONS.describes.indexOf(v.describes) < 0) return 'Please pick what describes you best.';
  if (OPTIONS.aiExperience.indexOf(v.aiExperience) < 0) return 'Please tell us if you’ve used AI tools before.';
  if (OPTIONS.laptop.indexOf(v.laptop) < 0) return 'Please tell us if you’ll bring a laptop.';
  if (OPTIONS.heardFrom.indexOf(v.heardFrom) < 0) v.heardFrom = 'Other';
  if (v.describes === SCHOOL_STUDENT && !v.parentPermission) return 'School students need a parent’s permission to come.';
  if (!v.photoConsent) return 'We need your okay for photos and video to register you.';
  return '';
}

// "+91 98765 43210", or "" if it isn't a 10-digit Indian mobile number.
function normalizePhone(raw) {
  const m = raw.replace(/[\s\-().]/g, '').match(/^(?:\+?91)?([6-9]\d{9})$/);
  return m ? '+91 ' + m[1].slice(0, 5) + ' ' + m[1].slice(5) : '';
}

// Same person = same name (ignoring case and spacing) and same last 10 digits of the number.
function dupKey(name, phone) {
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ') + '|' + String(phone).replace(/\D/g, '').slice(-10);
}

function str(x) {
  return typeof x === 'string' ? x.trim() : '';
}

// Stop text that starts with = + - @ being read as a formula (also keeps "+91…" as text).
function safeCell(x) {
  return typeof x === 'string' && /^[=+\-@]/.test(x) ? "'" + x : x;
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function reply(ok, status, message) {
  return ContentService.createTextOutput(JSON.stringify({ ok: ok, status: status, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// MailApp on a personal Gmail account can send about 100 emails a day
// (check with MailApp.getRemainingDailyQuota()). Past that, rows are still saved; only the email is skipped.
function sendConfirmation(v, status) {
  if (MailApp.getRemainingDailyQuota() < 1) {
    console.warn('Daily email quota used up; no email sent to ' + v.email);
    return;
  }
  const first = v.name.split(' ')[0];
  const details = [
    'Date: ' + EVENT.date,
    'Time: ' + EVENT.time,
    'Venue: ' + EVENT.venue + (EVENT.mapsUrl ? '\nMap: ' + EVENT.mapsUrl : ''),
    'Bring: ' + EVENT.whatToBring,
  ].join('\n');

  let subject, body;
  if (status === 'registered') {
    subject = 'You’re in: ' + EVENT.name;
    body = [
      'Hi ' + first + ',',
      '',
      'Your seat at ' + EVENT.name + ' is saved. Entry is free, and chai, snacks and lunch are on us.',
      '',
      details,
      '',
      EVENT.whatsappGroupUrl
        ? 'Join the WhatsApp group for updates: ' + EVENT.whatsappGroupUrl
        : 'We’ll share updates on Instagram: ' + EVENT.instagram,
      '',
      'If you can’t come any more, just reply to this email so someone on the waitlist can take your seat.',
      '',
      'See you there,',
      'Kota Codes',
    ].join('\n');
  } else {
    subject = 'You’re on the waitlist: ' + EVENT.name;
    body = [
      'Hi ' + first + ',',
      '',
      'Thanks for signing up for ' + EVENT.name + '. All seats are taken for now, so you’re on the waitlist.',
      'If a seat opens up, we’ll message you on WhatsApp and email, in the order people signed up.',
      '',
      details,
      '',
      'Follow us on Instagram for the next meetups: ' + EVENT.instagram,
      '',
      'Kota Codes',
    ].join('\n');
  }

  MailApp.sendEmail({ to: v.email, subject: subject, body: body, name: 'Kota Codes' });
}
