import type { Business, Lang, Sentiment } from "./store";

export type DraftInput = { picks: string[]; items: string[]; sentiment: Sentiment; lang: Lang };
export type DraftResult = { text: string; source: "llm" | "template"; normalizedBy: "open-model" | "rules" };

/* ---------- 1. Generation (any OpenAI-compatible chat endpoint) ---------- */

const LANG_NAME: Record<Lang, string> = { en: "English", ur: "Urdu (Urdu script, not Roman Urdu)" };

function generationPrompt(b: Business, d: DraftInput) {
  return [
    {
      role: "system",
      content:
        `You help a real customer put their OWN experience at a ${b.kind} into words. ` +
        `Write in first person, ${LANG_NAME[d.lang]}, 2-4 sentences, under 70 words. ` +
        `Use ONLY the points the customer chose. Never invent dishes, staff names, prices or events. ` +
        `Keep the customer's sentiment exactly: ${d.sentiment}. Do not soften criticism or exaggerate praise. ` +
        `No hashtags, no emojis, no star ratings.`,
    },
    {
      role: "user",
      content:
        `Place: ${b.name}, ${b.city}\nMy overall feeling: ${d.sentiment}\n` +
        `What I noticed: ${d.picks.join("; ")}\n` +
        (d.items.length ? `What I had: ${d.items.join(", ")}\n` : "") +
        `Write my review.`,
    },
  ];
}

/* ---------- 2. Normalization (open-source model, e.g. Qwen / Llama / Gemma) ----------
   The first draft from any model tends to sound like marketing copy. This pass rewrites it
   in plain, everyday customer language and is checked so it can't drift in meaning. */

function normalizePrompt(draft: string, d: DraftInput) {
  return [
    {
      role: "system",
      content:
        `Rewrite the review so it reads like an ordinary customer typed it on their phone. ` +
        `Plain everyday words, short sentences, first person, ${LANG_NAME[d.lang]}. ` +
        `Remove marketing phrases and filler ("delightful", "testament to", "nestled", "culinary journey", "overall", "I highly recommend"). ` +
        `Keep every fact and keep the sentiment (${d.sentiment}) exactly. Add nothing new. ` +
        `Return only the rewritten review.`,
    },
    { role: "user", content: draft },
  ];
}

type Msg = { role: string; content: string };

async function chat(baseUrl: string, apiKey: string | undefined, model: string, messages: Msg[]) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 300 }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  // Qwen3-style models may emit <think> blocks; drop them.
  return String(json.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/* ---------- 3. Rule-based cleanup: always runs, also the offline fallback ---------- */

const AI_ISMS: [RegExp, string][] = [
  [/\s*[—–]\s*/g, ", "],
  [/\b(overall|in conclusion|all in all),?\s*/gi, ""],
  [/\b(truly|absolutely|incredibly|exceptionally|undeniably)\s+/gi, ""],
  [/\bdelightful\b/gi, "nice"],
  [/\ba testament to\b/gi, "shows"],
  [/\bnestled in\b/gi, "in"],
  [/\bculinary (journey|experience|delights?)\b/gi, "food"],
  [/\bambiance\b/gi, "atmosphere"],
  [/!{2,}/g, "!"],
  [/\s{2,}/g, " "],
];

export function scrub(text: string) {
  let t = text.replace(/^["'\s]+|["'\s]+$/g, "");
  for (const [re, rep] of AI_ISMS) t = t.replace(re, rep);
  t = t.replace(/(^|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase()); // re-capitalise after removals
  // Keep at most one exclamation mark; the rest become full stops.
  let seen = false;
  t = t.replace(/!/g, () => (seen ? "." : ((seen = true), "!")));
  return t.replace(/,\s*,/g, ",").replace(/\s+([.,!?])/g, "$1").trim();
}

const OPENERS: Record<Sentiment, Record<Lang, string>> = {
  positive: { en: "Had a good time at {name}.", ur: "{name} میں اچھا وقت گزرا۔" },
  neutral: { en: "Visited {name} in {city}.", ur: "{city} میں {name} جانا ہوا۔" },
  negative: { en: "My visit to {name} didn't go well.", ur: "{name} کا تجربہ اچھا نہیں رہا۔" },
};
const CLOSERS: Record<Sentiment, Record<Lang, string>> = {
  positive: { en: "Would come back.", ur: "دوبارہ ضرور آؤں گا۔" },
  neutral: { en: "It was okay.", ur: "ٹھیک ٹھاک تھا۔" },
  negative: { en: "Hope they sort this out.", ur: "امید ہے یہ بہتر کریں گے۔" },
};

export function templateDraft(b: Business, d: DraftInput) {
  const fill = (s: string) => s.replace("{name}", b.name).replace("{city}", b.city);
  const sep = d.lang === "ur" ? "۔ " : ". ";
  const had = d.items.length ? (d.lang === "ur" ? `میں نے ${d.items.join("، ")} لیا${sep}` : `I had the ${d.items.join(" and ")}${sep}`) : "";
  const points = d.picks.join(sep) + sep;
  return `${fill(OPENERS[d.sentiment][d.lang])} ${had}${points}${CLOSERS[d.sentiment][d.lang]}`.replace(/\s+/g, " ").trim();
}

/** Reject a normalized version that lost content or changed tone. */
export function acceptNormalized(draft: string, norm: string, s: Sentiment) {
  if (!norm || norm.length < draft.length * 0.4 || norm.length > draft.length * 1.6) return false;
  const praise = /\b(amazing|excellent|fantastic|perfect|best|loved|great)\b/i;
  if (s === "negative" && praise.test(norm) && !praise.test(draft)) return false;
  return true;
}

export async function draftReview(b: Business, d: DraftInput): Promise<DraftResult> {
  const base = process.env.LLM_BASE_URL;
  const key = process.env.LLM_API_KEY;
  const genModel = process.env.LLM_MODEL;
  const normBase = process.env.NORMALIZER_BASE_URL || base;
  const normKey = process.env.NORMALIZER_API_KEY || key;
  const normModel = process.env.NORMALIZER_MODEL;

  let text = templateDraft(b, d);
  let source: DraftResult["source"] = "template";
  if (base && genModel) {
    try {
      text = await chat(base, key, genModel, generationPrompt(b, d));
      source = "llm";
    } catch (e) {
      console.error("[generate] falling back to template:", (e as Error).message);
    }
  }

  let normalizedBy: DraftResult["normalizedBy"] = "rules";
  if (normBase && normModel) {
    try {
      const n = await chat(normBase, normKey, normModel, normalizePrompt(text, d));
      if (acceptNormalized(text, n, d.sentiment)) {
        text = n;
        normalizedBy = "open-model";
      }
    } catch (e) {
      console.error("[normalize] skipped:", (e as Error).message);
    }
  }
  return { text: scrub(text), source, normalizedBy };
}
