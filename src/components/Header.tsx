import { Logo } from './Logo';

const LINKS = [
  ['#about', 'About'],
  ['#day', 'The day'],
  ['#speakers', 'Speakers'],
  ['#faq', 'FAQ'],
];

export function Header() {
  return (
    <header className="band" style={{ borderTop: 0 }}>
      <nav className="frame cells nav" aria-label="Main">
        <a className="home" href="#top">
          <Logo />
          <span>
            kota<b>.codes</b>
          </span>
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
