import type { Page } from '../App';
import { Arrow } from './Arrow';
import { Lockup } from './Logo';

// Root-relative, so they work from /register too. On the home page they only scroll.
const LINKS = [
  ['/#about', 'About'],
  ['/#speakers', 'Speakers'],
  ['/#day', 'The day'],
  ['/#faq', 'FAQ'],
];

// On /register the chat is the whole page, so there's no "Save your seat" button to send people to it.
export function Header({ page }: { page: Page }) {
  const home = page === 'home';
  return (
    <header className="band" style={{ borderTop: 0 }}>
      <nav className={home ? 'frame cells nav' : 'frame cells nav no-cta'} aria-label="Main">
        <a className="home" href={home ? '#top' : '/'} aria-label={home ? 'kota.codes, back to top' : 'kota.codes home'}>
          <Lockup />
        </a>
        {LINKS.map(([href, label]) => (
          <a key={href} className="link" href={href}>
            {label}
          </a>
        ))}
        {home && (
          <a className="cta nudge" href="/register">
            Save your seat <Arrow />
          </a>
        )}
      </nav>
    </header>
  );
}
