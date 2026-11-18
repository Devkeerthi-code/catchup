import Link from "next/link";
import { Bento } from "@/components/home/bento";
import { CompareTable } from "@/components/home/compare-table";
import { Faq } from "@/components/home/faq";
import { HeroCollapse } from "@/components/home/hero-collapse";
import { HomeStats } from "@/components/home/home-stats";
import { HowSteps } from "@/components/home/how-steps";
import { Icon } from "@/components/ui/icon";

function Hero() {
  return (
    <section className="hero shell" aria-labelledby="hero-title">
      <div className="hero__grid">
        <div>
          <span className="eyebrow">For class, club, hostel and work groups</span>
          <h1 id="hero-title">
            Read the <span className="hl">9 messages that matter.</span> Skip the other 1,275.
          </h1>
          <p className="hero__lead">
            Export your group chat and drop it here. CatchUp pulls out the deadlines, decisions, links and questions nobody answered, and
            shows the exact message each one came from.
          </p>
          <div className="hero__ctas">
            <Link className="btn btn--primary" href="/import">
              <span className="btn__dot" aria-hidden="true" />
              Catch up on a chat
            </Link>
            <Link className="btn btn--secondary" href="/demo">
              See a demo catch-up
            </Link>
          </div>
          <ul className="trust">
            <li>
              <Icon id="u-device" />
              Names and numbers masked on your device
            </li>
            <li>
              <Icon id="u-lock" />
              Raw chat never stored
            </li>
            <li>
              <Icon id="u-check" />
              No sign-up to try
            </li>
          </ul>
        </div>
        <HeroCollapse />
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="shell closing" aria-labelledby="closing-title">
      <div className="closing__inner">
        <div className="noise closing__noise" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <h2 id="closing-title">Missed a day of the group? Get it back in a minute.</h2>
        <Link className="btn btn--primary" href="/import">
          <span className="btn__dot" aria-hidden="true" />
          Catch up on a chat
        </Link>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      <Bento />
      <section className="shell" aria-label="Numbers">
        <HomeStats />
      </section>
      <CompareTable />
      <HowSteps />
      <Faq />
      <ClosingCta />
    </main>
  );
}
