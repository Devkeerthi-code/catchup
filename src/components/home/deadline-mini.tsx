"use client";

import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { downloadText } from "@/lib/client/download";
import { buildIcs } from "@/lib/ics";
import type { DeadlineItem } from "@/lib/summary/types";
import { localDateKey } from "@/lib/ui/format";

/** A real .ics made in the browser from a fictional deadline, dated tomorrow so it opens as upcoming. */
function demoDeadline(): DeadlineItem {
  return {
    id: "demo-e1",
    type: "deadline",
    sourceIds: [],
    at: Date.now(),
    title: "DBMS lab record submission (demo)",
    date: localDateKey(Date.now() + 86_400_000),
    time: "09:00",
    place: "Lab 3, CSE block, 2nd floor",
    changes: ["Moved up from Monday"],
  };
}

export function DeadlineMini() {
  const toast = useToast();
  return (
    <div className="bento__ui deadline-mini">
      <div className="deadline-mini__top">
        <span className="chip-urgent">Due in 9 h</span>
        <span className="chip-meta">Moved up from Monday</span>
      </div>
      <h4>DBMS lab record submission</h4>
      <dl className="facts">
        <div>
          <dt>
            <Icon id="u-clock" />
            <span className="visually-hidden">When</span>
          </dt>
          <dd>Sat 21 Nov, 9:00 AM</dd>
        </div>
        <div>
          <dt>
            <Icon id="u-pin" />
            <span className="visually-hidden">Where</span>
          </dt>
          <dd>Lab 3, CSE block, 2nd floor</dd>
        </div>
      </dl>
      <div>
        <button
          className="btn btn--secondary btn--sm"
          type="button"
          onClick={() => {
            downloadText("demo-deadline.ics", buildIcs([demoDeadline()], "CSE-B 2nd Year (demo)"), "text/calendar;charset=utf-8");
            toast("Demo calendar file saved. It's fictional, so delete it after you look.");
          }}
        >
          <Icon id="u-cal-plus" />
          Add to calendar (.ics)
        </button>
      </div>
    </div>
  );
}
