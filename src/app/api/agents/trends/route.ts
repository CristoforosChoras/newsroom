import { NextResponse } from "next/server";
import type { Trend } from "@/lib/types";
import { siteBySeoKey, siteById } from "@/lib/config/sites";

// Server-only proxy to the n8n "Trend Radar API" webhook. Secret stays server-side.
// Maps n8n site keys (domains) → FE site ids. 502 on failure (no mock).
// Env: N8N_TRENDS_WEBHOOK_URL + N8N_SEO_SECRET (shared secret).

export const dynamic = "force-dynamic";

// n8n returns trends keyed by its `site` value (domain or id); normalize to FE id.
function toFeId(site: string | undefined): string {
  if (!site) return "";
  if (siteById(site)) return site; // already an FE id
  return siteBySeoKey(site)?.id ?? site;
}

async function fetchTrends(scope: string | null) {
  const url = process.env.N8N_TRENDS_WEBHOOK_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return { ok: false as const, error: "N8N_TRENDS_WEBHOOK_URL / N8N_SEO_SECRET not configured" };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-matrix-secret": secret },
    body: JSON.stringify({ scope: scope ?? "all" }),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false as const, error: `n8n responded ${res.status}` };
  const text = await res.text();
  if (!text.trim()) return { ok: false as const, error: "n8n returned an empty body" };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false as const, error: "n8n returned non-JSON" };
  }
  // accept either an array or { trends: [...] }
  const arr: Trend[] = Array.isArray(raw)
    ? (raw as Trend[])
    : ((raw as { trends?: Trend[] }).trends ?? []);
  const trends = arr.map((t) => ({
    ...t,
    site: toFeId(t.site),
    suggestedSites: t.suggestedSites?.map((s) => ({
      ...s,
      site: toFeId(s.site),
    })),
  }));
  return { ok: true as const, trends };
}

async function handle(req: Request) {
  const scope = new URL(req.url).searchParams.get("scope");
  try {
    const r = await fetchTrends(scope);
    if (r.ok) return NextResponse.json(r.trends);
    return NextResponse.json({ error: r.error }, { status: 502 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "trends proxy failed" },
      { status: 502 },
    );
  }
}

export const POST = handle;
export const GET = handle;
