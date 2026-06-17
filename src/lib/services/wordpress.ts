import type { Cell } from "@/lib/types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Stubbed WordPress publish. Returns a fake post id after a short delay so the
 * UI flow (drawer → Published column → toast) is fully exercisable offline.
 *
 * TODO(backend): POST `${site.wp}/wp-json/wp/v2/posts` with the editor-approved
 * fields — post_title (cell.headline/seoTitle), post_content (cell.body), excerpt
 * (cell.excerpt), slug (cell.slug), featured image (cell.featured), categories
 * (cell.category/site.wpCat), tags (cell.tags) + Yoast/RankMath meta (seoTitle,
 * seoDesc). Return the real created post id. This should run server-side (a route
 * handler) — never call the WP REST API from the browser.
 */
export async function publishToWp(_cell: Cell): Promise<{ postId: number }> {
  await delay(550);
  return { postId: Math.floor(Math.random() * 9000 + 1000) };
}
