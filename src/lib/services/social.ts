import type { Cell } from "@/lib/types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Stubbed social publish. Returns a fake post id after a short delay so the
 * Social board flow (drawer → Δημοσιευμένα → toast) is fully exercisable offline.
 *
 * TODO(backend): publish to the platform's Graph/Content API (Meta, TikTok, X)
 * with caption (cell.caption), hashtags (cell.hashtags), media, and an optional
 * scheduled time (cell.scheduledAt). Return the real created post id. This must
 * run server-side (a route handler) — never call platform APIs from the browser.
 */
export async function publishToSocial(_cell: Cell): Promise<{ postId: string }> {
  await delay(450);
  return { postId: `sp_${Math.floor(Math.random() * 9000 + 1000)}` };
}
