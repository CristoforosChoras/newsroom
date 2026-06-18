import { NextResponse } from "next/server";

// Server-only proxy that manually kicks the n8n "AMNA Ingest" crawl (the Kick
// webhook). The crawl runs ~3 min and the webhook stays open until it finishes,
// so we fire it and return immediately — n8n keeps executing server-side after we
// disconnect (the same async behaviour behind its Cloudflare 524). We just need
// the request to land. Env: N8N_AMNA_RUN_WEBHOOK_URL + N8N_SEO_SECRET.

export const dynamic = "force-dynamic";

export async function POST() {
  const url = process.env.N8N_AMNA_RUN_WEBHOOK_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return NextResponse.json(
      { error: "N8N_AMNA_RUN_WEBHOOK_URL / N8N_SEO_SECRET not configured" },
      { status: 502 },
    );
  }
  // Give the request enough time to reach n8n and start the run, then stop
  // waiting — the crawl continues on the n8n side regardless of this timeout.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-matrix-secret": secret },
      body: JSON.stringify({ source: "manual" }),
      cache: "no-store",
      signal: ctrl.signal,
    });
  } catch {
    // AbortError (expected) or transient network error — the run has already
    // been accepted by n8n. Surface nothing fatal; the inbox refreshes later.
  } finally {
    clearTimeout(t);
  }
  return NextResponse.json({ accepted: true });
}
