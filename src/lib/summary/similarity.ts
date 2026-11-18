const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "for", "is", "are", "was", "will", "be",
  "by", "with", "from", "this", "that", "it", "as", "has", "have", "all", "our", "we", "you", "they",
]);

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordSet(text: string): Set<string> {
  return new Set(normalizeText(text).split(" ").filter((w) => w.length > 1 && !STOPWORDS.has(w)));
}

/**
 * Near-duplicate score in 0..1: the larger of Jaccard similarity and a damped containment score,
 * so "Lab record due Friday" matches "Submit the lab record by Friday 5 PM".
 */
export function similarity(a: string, b: string): number {
  const x = wordSet(a);
  const y = wordSet(b);
  if (!x.size || !y.size) return normalizeText(a) === normalizeText(b) ? 1 : 0;
  let shared = 0;
  for (const word of x) if (y.has(word)) shared++;
  const jaccard = shared / (x.size + y.size - shared);
  const containment = Math.min(x.size, y.size) >= 2 ? (shared / Math.min(x.size, y.size)) * 0.85 : 0;
  return Math.max(jaccard, containment);
}

/** Greedy clustering: each item joins the first group it is similar enough to. */
export function cluster<T>(items: T[], isSame: (a: T, b: T) => boolean): T[][] {
  const groups: T[][] = [];
  for (const item of items) {
    const group = groups.find((g) => g.some((member) => isSame(member, item)));
    if (group) group.push(item);
    else groups.push([item]);
  }
  return groups;
}
