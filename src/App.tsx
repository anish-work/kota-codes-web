import { About } from './components/About';
import { Countdown } from './components/Countdown';
import { Day } from './components/Day';
import { Faq } from './components/Faq';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PageEdge } from './components/Pixel';
import { Register } from './components/Register';
import { Speakers } from './components/Speakers';
import { Takeaways } from './components/Takeaways';
import { Who } from './components/Who';

export function App() {
  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <Countdown />
      <Header />
      <main id="top">
        <Hero />
        <About />
        <Speakers />
        <Who />
        <Day />
        <Takeaways />
        <Faq />
        <Register />
      </main>
      <PageEdge />
      <Footer />
    </>
  );
}
