import type { Page } from '../App';
import { Lockup } from './Logo';

// Root-relative, so they work from every page. On the home page the anchors only scroll.
const LINKS: [href: string, label: string, page?: Page][] = [
  ['/#about', 'About'],
  ['/meetup-01', 'Meetup 01', 'meetup'],
  ['/#whats-next', 'What’s next'],
  ['/#get-involved', 'Get involved'],
];

export function Header({ page }: { page: Page }) {
  const home = page === 'home';
  return (
    <header className="band" style={{ borderTop: 0 }}>
      <nav className="frame cells nav" aria-label="Main">
        <a className="home" href={home ? '#top' : '/'} aria-label={home ? 'kota.codes, back to top' : 'kota.codes home'}>
          <Lockup />
        </a>
        {LINKS.map(([href, label, to]) => (
          <a key={href} className="link" href={href} aria-current={to === page ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
