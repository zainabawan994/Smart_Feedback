import type { Draft } from "./store.ts";

/** One complaint option, measured over the whole draft history. */
export type Issue = {
  label: string; // the option customers picked, e.g. "Long wait"
  count: number; // drafts that mention it
  negative: number; // of those, from "Not great" drafts (neutral "it was okay" picks are milder)
  share: number; // of all not-happy drafts (0..1)
  last7: number;
  prev7: number;
  trend: "rising" | "falling" | "steady" | "new";
  severity: "major" | "minor";
  dishes: string[]; // dishes most often ordered alongside it
  occasions: string[];
  examples: { text: string; at: string; lang: Draft["lang"] }[];
};

export type Analysis = {
  total: number;
  unhappy: number; // negative + neutral drafts
  negative: number;
  issues: Issue[]; // most serious first
  praise: { label: string; count: number }[];
};

const DAY = 86_400_000;

function top(list: string[], n: number) {
  const c = new Map<string, number>();
  for (const x of list) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

/**
 * Plain counting, no AI, so it always works and owners can trust the numbers.
 * Major = a real pattern among "Not great" visits: 3+ such mentions and a quarter of unhappy visits,
 * or a sudden jump (3+ this week and at least double the week before). Picks that only come from
 * "It was okay" visits (e.g. "Seating was alright") are never major.
 */
export function analyze(drafts: Draft[], now = Date.now()): Analysis {
  const unhappy = drafts.filter((d) => d.sentiment !== "positive");
  const byLabel = new Map<string, Draft[]>();
  for (const d of unhappy) for (const p of d.picks) byLabel.set(p, [...(byLabel.get(p) ?? []), d]);

  const issues: Issue[] = [...byLabel.entries()].map(([label, ds]) => {
    const age = (d: Draft) => now - +new Date(d.at);
    const last7 = ds.filter((d) => age(d) < 7 * DAY).length;
    const prev7 = ds.filter((d) => age(d) >= 7 * DAY && age(d) < 14 * DAY).length;
    const share = ds.length / Math.max(1, unhappy.length);
    const neg = ds.filter((d) => d.sentiment === "negative");
    const negLast7 = neg.filter((d) => age(d) < 7 * DAY).length;
    const negPrev7 = neg.filter((d) => age(d) >= 7 * DAY && age(d) < 14 * DAY).length;
    const spike = negLast7 >= 3 && negLast7 >= 2 * negPrev7;
    const trend: Issue["trend"] = prev7 === 0 && last7 > 0 && ds.length === last7 ? "new" : last7 > prev7 ? "rising" : last7 < prev7 ? "falling" : "steady";
    return {
      label,
      count: ds.length,
      negative: neg.length,
      share,
      last7,
      prev7,
      trend,
      severity: (neg.length >= 3 && share >= 0.25) || spike ? "major" : "minor",
      dishes: top(ds.flatMap((d) => d.items), 3),
      occasions: top(ds.flatMap((d) => d.occasions), 2),
      examples: ds.slice(0, 2).map((d) => ({ text: d.text, at: d.at, lang: d.lang })),
    };
  });
  issues.sort((a, b) => (a.severity === b.severity ? b.negative - a.negative || b.count - a.count || b.last7 - a.last7 : a.severity === "major" ? -1 : 1));

  const praise = top(drafts.filter((d) => d.sentiment === "positive").flatMap((d) => d.picks), 5).map((label) => ({
    label,
    count: drafts.filter((d) => d.sentiment === "positive" && d.picks.includes(label)).length,
  }));

  return { total: drafts.length, unhappy: unhappy.length, negative: drafts.filter((d) => d.sentiment === "negative").length, issues, praise };
}
