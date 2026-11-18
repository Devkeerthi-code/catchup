import { Icon } from "@/components/ui/icon";

function Bars({ rows }: { rows: { w: string; kind?: "ink" | "lit" }[][] }) {
  return (
    <div className="step__art" aria-hidden="true">
      {rows.map((row, i) => (
        <div className="row" key={i}>
          {row.map((bar, j) => (
            <i key={j} className={bar.kind} style={{ width: bar.w }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function HowSteps() {
  return (
    <section className="section shell pt-0" aria-labelledby="how-title">
      <div className="section-head">
        <span className="eyebrow">How it works</span>
        <h2 id="how-title">Four steps. About a minute.</h2>
      </div>
      <ol className="steps">
        <li className="step">
          <Bars rows={[[{ w: "40%" }], [{ w: "72%" }], [{ w: "30%", kind: "ink" }, { w: "20%" }], [{ w: "56%" }]]} />
          <span className="step__n">01</span>
          <h3>Export the chat</h3>
          <p className="path">
            WhatsApp: <kbd>Group</kbd> › <kbd>More</kbd> › <kbd>Export chat</kbd> › <kbd>Without media</kbd>
          </p>
          <p>Telegram, Slack, Discord, Instagram and Messenger exports work too. Or copy and paste the messages.</p>
        </li>
        <li className="step">
          <div className="step__art step__art--center" aria-hidden="true">
            <Icon id="u-upload" className="icon step__icon" />
          </div>
          <span className="step__n">02</span>
          <h3>Drop it in</h3>
          <p>A .txt, .zip, .json or .csv file, pasted text, or up to 4 screenshots. The app and date format are detected for you.</p>
        </li>
        <li className="step">
          <Bars
            rows={[
              [{ w: "22%", kind: "ink" }, { w: "50%" }],
              [{ w: "22%", kind: "ink" }, { w: "34%" }, { w: "14%", kind: "ink" }],
              [{ w: "22%", kind: "ink" }, { w: "60%" }],
            ]}
          />
          <span className="step__n">03</span>
          <h3>It’s masked on your device</h3>
          <p>Reading and masking run in your browser. Only masked text from the range you pick is sent to be summarised.</p>
        </li>
        <li className="step">
          <Bars rows={[[{ w: "50%" }], [{ w: "82%", kind: "lit" }], [{ w: "36%" }], [{ w: "64%", kind: "lit" }]]} />
          <span className="step__n">04</span>
          <h3>Get your catch-up</h3>
          <p>A five-line TL;DR, then deadlines, decisions, links, files, polls and open questions, each with its source.</p>
        </li>
      </ol>
    </section>
  );
}
