import { Lockup } from './Logo';

const LINKS = [
  ['#about', 'About'],
  ['#speakers', 'Speakers'],
  ['#day', 'The day'],
  ['#faq', 'FAQ'],
];

export function Header() {
  return (
    <header className="band" style={{ borderTop: 0 }}>
      <nav className="frame cells nav" aria-label="Main">
        <a className="home" href="#top" aria-label="kota.codes, back to top">
          <Lockup />
        </a>
        {LINKS.map(([href, label]) => (
          <a key={href} className="link" href={href}>
            {label}
          </a>
        ))}
        <a className="cta" href="#register-form">
          Save your seat <span className="arrow" aria-hidden="true">→</span>
        </a>
      </nav>
    </header>
  );
}
