const ROWS = [
  {
    task: "Find the deadline",
    old: "Search “submission”, then keep scrolling in case someone changed the date later.",
    next: "Every date pulled out with its later changes listed, one tap to your calendar.",
  },
  {
    task: "Know what was decided",
    old: "Read the whole argument to find who finally said yes.",
    next: "The decision on one line, with the message that settled it.",
  },
  {
    task: "Get the right link",
    old: "The same Drive link shared four times, the latest version buried.",
    next: "Each link once, with its site and how many times it was shared.",
  },
  {
    task: "Spot unanswered questions",
    old: "Gone after forty new messages. Someone asks again tomorrow.",
    next: "Listed on their own, so you can be the one who answers.",
  },
  {
    task: "Keep people’s details private",
    old: "Pasting the chat into a chatbot sends every name and number with it.",
    next: "Names, phones, emails and UPI IDs masked on your device first.",
  },
];

export function CompareTable() {
  const total = String(ROWS.length).padStart(2, "0");
  return (
    <section className="section shell" aria-labelledby="compare-title">
      <div className="section-head">
        <span className="eyebrow">Side by side</span>
        <h2 id="compare-title">Scrolling the chat vs CatchUp</h2>
      </div>
      <table className="compare">
        <caption className="visually-hidden">Five everyday tasks, done by scrolling versus with CatchUp</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Task</th>
            <th scope="col">Scrolling the chat</th>
            <th scope="col">With CatchUp</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.task}>
              <td className="idx">
                {String(i + 1).padStart(2, "0")} <span>/ {total}</span>
              </td>
              <th scope="row">{row.task}</th>
              <td className="old" data-label="Scrolling the chat">
                {row.old}
              </td>
              <td className="new" data-label="With CatchUp">
                {row.next}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
