import { About } from './components/About';
import { Countdown } from './components/Countdown';
import { Day } from './components/Day';
import { Faq } from './components/Faq';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PageEdge } from './components/Pixel';
import { Register, RegisterPage } from './components/Register';
import { Speakers } from './components/Speakers';
import { Takeaways } from './components/Takeaways';
import { Venue } from './components/Venue';
import { Who } from './components/Who';

export type Page = 'home' | 'register';

// "/register" (with or without a trailing slash) is the registration page; every other path is the home page.
export const pageFor = (path: string): Page => (/^\/register\/?$/.test(path) ? 'register' : 'home');

export function App({ page }: { page: Page }) {
  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <Countdown />
      <Header page={page} />
      <main id="top">
        {page === 'register' ? (
          <RegisterPage />
        ) : (
          <>
            <Hero />
            <About />
            <Speakers />
            <Who />
            <Day />
            <Venue />
            <Takeaways />
            <Faq />
            <Register />
          </>
        )}
      </main>
      {/* /register is the chat, filling the screen like an app, so it ends there. */}
      {page === 'home' && (
        <>
          <PageEdge />
          <Footer />
        </>
      )}
    </>
  );
}
