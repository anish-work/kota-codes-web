import { CONFIG } from './config';

// Option labels are stored in the Sheet as written. Keep in sync with apps-script/Code.gs.
export const SCHOOL_STUDENT = 'School student (Class 9+)';

export const DESCRIBES = [
  'College student',
  SCHOOL_STUDENT,
  'Coaching student',
  'Working or freelancing',
  'Business owner',
  'Teacher or parent',
  'Other',
];
export const AI_EXPERIENCE = ['Never', 'A few times', 'Often'];
export const LAPTOP = ['Yes', 'No', 'Phone only'];
export const HEARD_FROM = ['Instagram', 'WhatsApp', 'A friend', 'College', 'iStart Nest', 'Other'];

export type FormValues = {
  name: string;
  whatsapp: string;
  email: string;
  describes: string;
  org: string;
  aiExperience: string;
  laptop: string;
  learn: string;
  heardFrom: string;
  parentPermission: boolean;
  photoConsent: boolean;
  website: string; // honeypot, must stay empty
};

export type FieldName = keyof FormValues;
export type Errors = Partial<Record<FieldName, string>>;

export const EMPTY: FormValues = {
  name: '',
  whatsapp: '',
  email: '',
  describes: '',
  org: '',
  aiExperience: '',
  laptop: '',
  learn: '',
  heardFrom: '',
  parentPermission: false,
  photoConsent: false,
  website: '',
};

// 10-digit Indian mobile, optionally prefixed with +91. Returns "+91 98765 43210" or null.
export function normalizePhone(raw: string) {
  const m = raw.replace(/[\s\-().]/g, '').match(/^(?:\+?91)?([6-9]\d{9})$/);
  return m ? `+91 ${m[1].slice(0, 5)} ${m[1].slice(5)}` : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validate(v: FormValues): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = 'Please tell us your name.';
  if (!v.whatsapp.trim()) e.whatsapp = 'Please add your WhatsApp number.';
  else if (!normalizePhone(v.whatsapp)) e.whatsapp = 'That doesn’t look like an Indian mobile number. Use 10 digits, like 98765 43210.';
  if (!v.email.trim()) e.email = 'Please add your email.';
  else if (!EMAIL.test(v.email.trim())) e.email = 'That email doesn’t look right. Check for typos.';
  if (!v.describes) e.describes = 'Please pick the one closest to you.';
  if (!v.aiExperience) e.aiExperience = 'Please pick one.';
  if (!v.laptop) e.laptop = 'Please pick one.';
  if (v.describes === SCHOOL_STUDENT && !v.parentPermission)
    e.parentPermission = 'Please check with a parent first, then tick this box.';
  if (!v.photoConsent) e.photoConsent = 'We take photos at the event, so we need your okay to register you.';
  return e;
}

export type Result = { ok: boolean; status: 'registered' | 'waitlist' | 'duplicate' | string; message: string };

// Plain-text JSON body and no custom headers, so the browser sends a "simple" request with no CORS preflight.
export async function submit(v: FormValues): Promise<Result> {
  if (!CONFIG.webAppUrl) throw new Error('Registration URL is not configured');
  const payload = {
    ...v,
    name: v.name.trim(),
    whatsapp: normalizePhone(v.whatsapp),
    email: v.email.trim(),
    org: v.org.trim(),
    learn: v.learn.trim(),
    parentPermission: v.describes === SCHOOL_STUDENT && v.parentPermission,
  };
  const res = await fetch(CONFIG.webAppUrl, { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
