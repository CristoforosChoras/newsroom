import { NextResponse } from "next/server";
import type { Cell } from "@/lib/types";
import { siteBySeoKey, siteById } from "@/lib/config/sites";

// Server-only proxy to the n8n "AMNA Inbox API" webhook — returns ingested wire
// articles as ready-to-add Story Cells. Secret stays server-side; maps n8n site
// keys (domains) → FE site ids. 502 on failure (no mock). Mirrors trends/route.ts.

export const dynamic = "force-dynamic";

// First sentence (or first ~180 chars) of the source text, for a short event line.
function firstSentence(text: string | undefined): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const cut = t.slice(0, 180);
  const m = cut.match(/^(.*?[.;!?·])\s/);
  return (m ? m[1] : cut).trim();
}

function toFeId(site: string | null | undefined): string | null {
  if (!site) return null;
  if (siteById(site)) return site;
  return siteBySeoKey(site)?.id ?? site;
}

async function fetchInbox() {
  const url = process.env.N8N_AMNA_INBOX_WEBHOOK_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return { ok: false as const, error: "N8N_AMNA_INBOX_WEBHOOK_URL / N8N_SEO_SECRET not configured" };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-matrix-secret": secret },
    body: JSON.stringify({}),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false as const, error: `n8n responded ${res.status}` };
  const text = await res.text();
  if (!text.trim()) return { ok: true as const, cells: [] as Cell[] }; // empty inbox
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false as const, error: "n8n returned non-JSON" };
  }
  const arr: Cell[] = Array.isArray(raw)
    ? (raw as Cell[])
    : ((raw as { cells?: Cell[] }).cells ?? []);
  const cells = arr.map((c) => ({
    ...c,
    site: toFeId(c.site),
    // amna_cells has no `event` column; derive a short event description from the
    // lead (meta) or the first sentence of the original text so the drawer's
    // "Event" field isn't empty for wire-ingested cells.
    event: (c.event?.trim() || c.meta?.trim() || firstSentence(c.sourceText)) ?? "",
  }));
  return { ok: true as const, cells };
}

async function handle() {
  try {
    const r = await fetchInbox();
    if (r.ok) return NextResponse.json(r.cells);
    return NextResponse.json({ error: r.error }, { status: 502 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "inbox proxy failed" },
      { status: 502 },
    );
  }
}

export const POST = handle;
export const GET = handle;
