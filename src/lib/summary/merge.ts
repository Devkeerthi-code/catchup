import { domainOf, extractFileMentions, extractUrls, normalizeUrl } from "../chat/text";
import type { Message } from "../chat/types";
import type { ChunkSummary } from "./schema";
import { cluster, normalizeText, similarity } from "./similarity";
import type {
  DeadlineItem, DecisionItem, FileItem, LinkItem, PollItem, QuestionItem, TldrLine,
} from "./types";

type TimeOf = (id: string) => number;

export interface MergedItems {
  highlights: TldrLine[];
  decisions: DecisionItem[];
  deadlines: DeadlineItem[];
  links: LinkItem[];
  files: FileItem[];
  questions: QuestionItem[];
  polls: PollItem[];
}

function sortIds(ids: Iterable<string>, timeOf: TimeOf): string[] {
  return [...new Set(ids)].sort((a, b) => timeOf(a) - timeOf(b) || a.localeCompare(b, "en", { numeric: true }));
}

function unionIds<T extends { sourceIds: string[] }>(group: T[], timeOf: TimeOf): string[] {
  return sortIds(group.flatMap((g) => g.sourceIds), timeOf);
}

function lastSourceTime(item: { sourceIds: string[] }, timeOf: TimeOf): number {
  return Math.max(...item.sourceIds.map(timeOf));
}

function sharesSource(a: { sourceIds: string[] }, b: { sourceIds: string[] }): boolean {
  return a.sourceIds.some((id) => b.sourceIds.includes(id));
}

/** Within a group of near-duplicates, the most recent wording wins (it reflects the latest state). */
function latest<T extends { sourceIds: string[] }>(group: T[], timeOf: TimeOf): T {
  return [...group].sort((a, b) => lastSourceTime(b, timeOf) - lastSourceTime(a, timeOf))[0];
}

function withIds<T extends { at: number }>(items: T[], prefix: string): T[] {
  return [...items].sort((a, b) => a.at - b.at).map((item, i) => ({ ...item, id: `${prefix}${i + 1}` }));
}

function mergeTexts(
  entries: { text: string; sourceIds: string[] }[],
  timeOf: TimeOf,
  threshold: number,
): { text: string; sourceIds: string[] }[] {
  const groups = cluster(entries, (a, b) => {
    const score = similarity(a.text, b.text);
    return score >= threshold || (sharesSource(a, b) && score >= threshold - 0.25);
  });
  return groups.map((group) => ({ text: latest(group, timeOf).text, sourceIds: unionIds(group, timeOf) }));
}

function mergeDecisions(parts: ChunkSummary[], timeOf: TimeOf): DecisionItem[] {
  const merged = mergeTexts(parts.flatMap((p) => p.decisions), timeOf, 0.6);
  return withIds(
    merged.map((d) => ({ id: "", type: "decision" as const, text: d.text, sourceIds: d.sourceIds, at: timeOf(d.sourceIds[0]) })),
    "d",
  );
}

type RawDeadline = ChunkSummary["deadlines"][number];

function sameEvent(a: RawDeadline, b: RawDeadline): boolean {
  const score = similarity(a.title, b.title);
  const datesCompatible = !a.date || !b.date || a.date === b.date;
  return score >= 0.7 || (datesCompatible && score >= 0.5) || (sharesSource(a, b) && score >= 0.35);
}

/** Merges repeated mentions of one event; later messages win and every change is listed. */
function mergeDeadlines(parts: ChunkSummary[], timeOf: TimeOf): DeadlineItem[] {
  const groups = cluster(parts.flatMap((p) => p.deadlines), sameEvent);
  const items = groups.map((group) => {
    const ordered = [...group].sort((a, b) => lastSourceTime(a, timeOf) - lastSourceTime(b, timeOf));
    const final = { ...ordered[ordered.length - 1] };
    const changes: string[] = [];
    for (const field of ["date", "time", "place"] as const) {
      const values = ordered.map((d) => d[field]).filter((v): v is string => Boolean(v));
      if (!final[field]) final[field] = values[values.length - 1] ?? null;
      const distinct = values.filter((v, i) => i === 0 || normalizeText(v) !== normalizeText(values[i - 1]));
      if (distinct.length > 1) {
        const label = field === "place" ? "Venue" : field === "date" ? "Date" : "Time";
        changes.push(`${label}: ${distinct.join(" → ")}`);
      }
    }
    const sourceIds = unionIds(group, timeOf);
    return {
      id: "", type: "deadline" as const, title: final.title, date: final.date, time: final.time,
      place: final.place, changes, sourceIds, at: timeOf(sourceIds[0]),
    };
  });
  return withIds(items, "e");
}

/** Links come from the messages themselves, never from the model, so none can be invented. */
export function collectLinks(messages: Message[]): LinkItem[] {
  const byKey = new Map<string, { url: string; ids: string[]; at: number }>();
  for (const m of messages) {
    if (m.system) continue;
    for (const url of extractUrls(m.text)) {
      const key = normalizeUrl(url);
      const entry = byKey.get(key) ?? { url: /^https?:\/\//i.test(url) ? url : `https://${url}`, ids: [], at: m.time };
      entry.ids.push(m.id);
      byKey.set(key, entry);
    }
  }
  const items = [...byKey.values()].map((entry, i) => ({
    id: `l${i + 1}`, type: "link" as const, url: entry.url, domain: domainOf(entry.url),
    shares: entry.ids.length, sourceIds: [...new Set(entry.ids)],
    at: entry.at,
  }));
  return withIds(items, "l");
}

function mergeFiles(parts: ChunkSummary[], messages: Message[], timeOf: TimeOf): FileItem[] {
  const found: { name: string; sourceIds: string[] }[] = [];
  for (const m of messages) {
    if (m.system) continue;
    for (const a of m.attachments) if (a.kind === "document" && a.name) found.push({ name: a.name, sourceIds: [m.id] });
    for (const name of extractFileMentions(m.text)) found.push({ name, sourceIds: [m.id] });
  }
  found.push(...parts.flatMap((p) => p.files));
  const groups = cluster(found, (a, b) => {
    const x = normalizeText(a.name);
    const y = normalizeText(b.name);
    return x === y || (sharesSource(a, b) && (x.includes(y) || y.includes(x)));
  });
  const items = groups.map((group) => {
    const sourceIds = unionIds(group, timeOf);
    // Prefer the real file name (has an extension) over the model's description of it.
    const name = group.find((g) => /\.\w{2,5}$/.test(g.name))?.name ?? group[0].name;
    return { id: "", type: "file" as const, name, sourceIds, at: timeOf(sourceIds[0]) };
  });
  return withIds(items, "f");
}

function mergePolls(parts: ChunkSummary[], messages: Message[], timeOf: TimeOf): PollItem[] {
  const formal: PollItem[] = messages.flatMap((m) =>
    m.poll
      ? [{
          id: "", type: "poll" as const, question: m.poll.question, options: m.poll.options,
          result: null, closed: m.poll.closed ?? false, sourceIds: [m.id], at: m.time,
        }]
      : [],
  );
  const informal = parts.flatMap((p) => p.polls);
  for (const poll of informal) {
    const match = formal.find((f) => sharesSource(f, poll) || similarity(f.question, poll.question) >= 0.7);
    if (match) {
      match.result = match.result ?? poll.result;
      match.sourceIds = sortIds([...match.sourceIds, ...poll.sourceIds], timeOf);
      continue;
    }
    const existing = formal.find((f) => similarity(f.question, poll.question) >= 0.6);
    if (existing) {
      existing.sourceIds = sortIds([...existing.sourceIds, ...poll.sourceIds], timeOf);
      continue;
    }
    formal.push({
      id: "", type: "poll", question: poll.question, options: poll.options, result: poll.result,
      closed: false, sourceIds: sortIds(poll.sourceIds, timeOf), at: timeOf(poll.sourceIds[0]),
    });
  }
  return withIds(formal, "p");
}

/** A question someone else replied to directly isn't "unanswered", whatever the model thought. */
function isAnswered(question: { sourceIds: string[] }, messages: Message[]): boolean {
  const asked = new Set(question.sourceIds);
  const askers = new Set(messages.filter((m) => asked.has(m.id)).map((m) => m.author));
  return messages.some((m) => m.replyTo !== null && asked.has(m.replyTo) && !askers.has(m.author) && m.text.trim().length > 0);
}

function mergeQuestions(parts: ChunkSummary[], messages: Message[], timeOf: TimeOf): QuestionItem[] {
  const groups = cluster(parts.flatMap((p) => p.openQuestions), (a, b) => {
    const score = similarity(a.question, b.question);
    return score >= 0.6 || (sharesSource(a, b) && score >= 0.3);
  });
  const items = groups
    .map((group) => {
      const sourceIds = unionIds(group, timeOf);
      const first = group[0];
      return { id: "", type: "question" as const, question: first.question, askedBy: first.askedBy, sourceIds, at: timeOf(sourceIds[0]) };
    })
    .filter((q) => !isAnswered(q, messages));
  return withIds(items, "q");
}

/** Reduce step: merges the per-chunk results into one deduplicated list per section. */
export function mergeChunkSummaries(parts: ChunkSummary[], messages: Message[]): MergedItems {
  const times = new Map(messages.map((m) => [m.id, m.time]));
  const timeOf: TimeOf = (id) => times.get(id) ?? 0;
  return {
    highlights: mergeTexts(parts.flatMap((p) => p.highlights), timeOf, 0.55),
    decisions: mergeDecisions(parts, timeOf),
    deadlines: mergeDeadlines(parts, timeOf),
    links: collectLinks(messages),
    files: mergeFiles(parts, messages, timeOf),
    questions: mergeQuestions(parts, messages, timeOf),
    polls: mergePolls(parts, messages, timeOf),
  };
}
