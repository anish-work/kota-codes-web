import type { Page } from '../App';
import { Lockup } from './Logo';

// Root-relative, so they work from /register too. On the home page they only scroll.
const LINKS = [
  ['/#about', 'About'],
  ['/#day', 'The day'],
  ['/#speakers', 'Speakers'],
  ['/#faq', 'FAQ'],
];

export function Header({ page }: { page: Page }) {
  const home = page === 'home';
  return (
    <header className="band" style={{ borderTop: 0 }}>
      <nav className="frame cells nav" aria-label="Main">
        <a className="home" href={home ? '#top' : '/'} aria-label={home ? 'kota.codes, back to top' : 'kota.codes home'}>
          <Lockup />
        </a>
        {LINKS.map(([href, label]) => (
          <a key={href} className="link" href={href}>
            {label}
          </a>
        ))}
        <a className="cta" href={home ? '/register' : '#register-form'}>
          Save your seat <span className="arrow" aria-hidden="true">→</span>
        </a>
      </nav>
    </header>
  );
}
