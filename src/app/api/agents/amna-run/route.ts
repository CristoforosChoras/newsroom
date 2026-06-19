import { NextResponse } from "next/server";

// Server-only proxy that runs the n8n "AMNA Newsfeed" crawl (the Kick webhook)
// and WAITS for it to finish. The Kick webhook responds at its last node (after
// the upsert), so awaiting it means the amna_cells table is fresh by the time we
// return — letting the caller immediately read the latest. We cap the wait so a
// rare cold-start crawl can't hang the request: on timeout we still report
// accepted (whatever was saved before the cutoff is already readable).
// Env: N8N_AMNA_RUN_WEBHOOK_URL + N8N_SEO_SECRET.

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST() {
  const url = process.env.N8N_AMNA_RUN_WEBHOOK_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return NextResponse.json(
      { error: "N8N_AMNA_RUN_WEBHOOK_URL / N8N_SEO_SECRET not configured" },
      { status: 502 },
    );
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 85000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-matrix-secret": secret },
      body: JSON.stringify({ source: "manual" }),
      cache: "no-store",
      signal: ctrl.signal,
    });
    // completed=true means the crawl pipeline finished server-side; the caller
    // can read the fresh table right away.
    return NextResponse.json({ accepted: true, completed: res.ok });
  } catch {
    // AbortError (slow cold-start crawl) or transient network error — the run was
    // accepted; the caller still reads whatever landed.
    return NextResponse.json({ accepted: true, completed: false });
  } finally {
    clearTimeout(t);
  }
}
