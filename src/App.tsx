import { About } from './components/About';
import { GetInvolved } from './components/Follow';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MeetupPage } from './components/Meetup';
import { Next } from './components/Next';
import { PageEdge } from './components/Pixel';
import { Recap } from './components/Recap';
import { RegisterClosed } from './components/RegisterClosed';
import { StatusBar } from './components/StatusBar';
import { Who } from './components/Who';

export type Page = 'home' | 'meetup' | 'register';

// "/meetup-01" and "/register" (with or without a trailing slash) have their own pages; every other path is home.
export function pageFor(path: string): Page {
  if (/^\/meetup-01\/?$/.test(path)) return 'meetup';
  if (/^\/register\/?$/.test(path)) return 'register';
  return 'home';
}

export function App({ page }: { page: Page }) {
  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <StatusBar />
      <Header page={page} />
      <main id="top">
        {page === 'home' && (
          <>
            <Hero />
            <About />
            <Recap />
            <Next />
            <Who />
            <GetInvolved />
          </>
        )}
        {page === 'meetup' && <MeetupPage />}
        {page === 'register' && <RegisterClosed />}
      </main>
      <PageEdge />
      <Footer />
    </>
  );
}
