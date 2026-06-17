import { SITES } from "@/lib/config/sites";

/**
 * Deterministic keyword router — REAL logic. Runs client-side today and stays
 * valid when the backend lands (the backend will only *augment* this with an
 * AI re-route via lib/services/agents.ts → rerouteStory).
 *
 * Counts how many of each site's keywords appear in the text; the highest
 * scoring site wins. Confidence scales with the number of keyword hits.
 */
export function routeContent(text: string): {
  site: string | null;
  confidence: number;
} {
  const t = (text || "").toLowerCase();
  let best: (typeof SITES)[number] | null = null;
  let score = 0;
  for (const s of SITES) {
    const c = s.kw.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0);
    if (c > score) {
      score = c;
      best = s;
    }
  }
  return {
    site: best ? best.id : null,
    confidence: best ? Math.min(96, 56 + score * 13) : 0,
  };
}
