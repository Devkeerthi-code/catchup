import { Icon } from "@/components/ui/icon";
import { PollBars } from "@/components/ui/poll-bars";
import { DeadlineMini } from "./deadline-mini";
import { HeatStrip } from "./heat-strip";
import { MaskDemo } from "./mask-demo";

const DEMO_LINKS = [
  { title: "OS Unit 4 notes", domain: "drive.google.com", count: 4 },
  { title: "Hackathon team form", domain: "forms.gle", count: 3 },
  { title: "Placement aptitude sheet", domain: "docs.google.com", count: 2 },
];

const DEMO_POLL = [
  { text: "Yes, after the lab", votes: 18 },
  { text: "No extra class", votes: 11 },
  { text: "Online instead", votes: 5 },
];

/** Six panels, each a small working piece of the real UI fed with fictional demo data. */
export function Bento() {
  return (
    <section className="section shell pt-0" aria-labelledby="what-title">
      <div className="section-head section-head--split">
        <div className="grid gap-3">
          <span className="eyebrow">What you get back</span>
          <h2 id="what-title">Six kinds of signal, each with its receipt.</h2>
        </div>
        <p>Every item links to the message it came from, so you can check it in two seconds instead of trusting a summary.</p>
      </div>

      <div className="bento">
        <article className="bento__cell b-7">
          <div className="bento__head">
            <span className="tag">
              <Icon id="u-mask" />
              Privacy
            </span>
            <span className="chip-meta">Runs in your browser</span>
          </div>
          <h3>Names and numbers are masked before anything leaves your phone</h3>
          <p>People become Member 1, Member 2. Phone numbers, emails and UPI IDs are replaced on your device. The summariser only sees the masked version.</p>
          <MaskDemo />
        </article>

        <article className="bento__cell b-5">
          <div className="bento__head">
            <span className="tag">
              <Icon id="i-deadline" />
              Deadline
            </span>
            <span className="chip-meta">Latest change wins</span>
          </div>
          <h3>Dates come out as dates</h3>
          <p>Time, room and the last-minute change, ready for your calendar.</p>
          <DeadlineMini />
        </article>

        <article className="bento__cell b-4">
          <div className="bento__head">
            <span className="tag">
              <Icon id="i-link" />
              Links
            </span>
            <span className="chip-meta">9 shares, 3 links</span>
          </div>
          <h3>The same link, counted once</h3>
          <ul className="bento__ui dedupe">
            {DEMO_LINKS.map((link) => (
              <li key={link.domain}>
                <span className="dedupe__title">
                  {link.title}
                  <span className="dedupe__domain">{link.domain}</span>
                </span>
                <span className="dedupe__count">×{link.count}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="bento__cell b-4">
          <div className="bento__head">
            <span className="tag">
              <Icon id="i-question" />
              Open question
            </span>
          </div>
          <h3>The question that got buried</h3>
          <div className="bento__ui question-mini">
            <q>Is the 2nd-year bus at 7:40 or 8:10 tomorrow?</q>
            <div className="noise" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="question-mini__meta">
              <span>Member 12 · 10:30 PM</span>
              <span>
                <b>0</b> replies
              </span>
              <span>
                <b>63</b> messages since
              </span>
            </div>
          </div>
        </article>

        <article className="bento__cell b-4">
          <div className="bento__head">
            <span className="tag">
              <Icon id="i-poll" />
              Poll
            </span>
            <span className="chip-meta">34 votes</span>
          </div>
          <h3>Polls, with the result</h3>
          <div className="bento__ui">
            <PollBars options={DEMO_POLL} />
          </div>
        </article>

        <article className="bento__cell b-12 bento__cell--wide">
          <div className="heat-wrap">
            <div className="grid gap-3">
              <span className="tag w-max">
                <Icon id="u-clock" />
                Group insights
              </span>
              <h3>When your group actually talks</h3>
              <p className="chip-meta text-sm">
                Busiest hours, counted on your device. In the demo chat, <b className="text-ink">41% of messages</b> land after 9 PM.
              </p>
            </div>
            <HeatStrip />
          </div>
        </article>
      </div>
    </section>
  );
}
