import { NextResponse } from "next/server";
import { SITES, siteBySeoKey, siteById } from "@/lib/config/sites";

// Server-only proxy to the n8n "Story Router API" webhook (Claude classifier).
// Injects the FE site catalog (one source of truth) so n8n stays generic; maps
// the returned site key → FE id. 502 on failure (the service falls back to the
// deterministic router). Env: N8N_ROUTE_WEBHOOK_URL + N8N_SEO_SECRET.

export const dynamic = "force-dynamic";

interface RoutePayload {
  site: string | null;
  confidence: number;
  reason: string;
}

function toFeId(site: string | null | undefined): string | null {
  if (!site) return null;
  if (siteById(site)) return site;
  return siteBySeoKey(site)?.id ?? site;
}

async function handle(req: Request) {
  const url = process.env.N8N_ROUTE_WEBHOOK_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return NextResponse.json(
      { error: "N8N_ROUTE_WEBHOOK_URL / N8N_SEO_SECRET not configured" },
      { status: 502 },
    );
  }
  let body: { headline?: string; event?: string; sourceText?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  // candidate portals the classifier picks from
  const sites = SITES.map((s) => ({
    id: s.id,
    name: s.name,
    vertical: s.vertical,
    keywords: s.kw,
  }));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-matrix-secret": secret },
      body: JSON.stringify({ ...body, sites }),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `n8n responded ${res.status}` }, { status: 502 });
    }
    const text = await res.text();
    if (!text.trim()) {
      return NextResponse.json({ error: "n8n returned an empty body" }, { status: 502 });
    }
    let raw: RoutePayload;
    try {
      raw = JSON.parse(text) as RoutePayload;
    } catch {
      return NextResponse.json({ error: "n8n returned non-JSON" }, { status: 502 });
    }
    return NextResponse.json({
      site: toFeId(raw.site),
      confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
      reason: raw.reason ?? "",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "route proxy failed" },
      { status: 502 },
    );
  }
}

export const POST = handle;
