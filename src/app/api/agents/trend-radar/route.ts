import { NextResponse } from "next/server";
import type { RadarTrend } from "@/lib/types";
import { siteBySeoKey, siteById } from "@/lib/config/sites";

// Server-only proxy to the Social Radar service Trend Radar endpoints.
// GET  ?scope=greece|global → service GET /trends?scope= (read stored feed)
// POST ?scope=greece|global → service POST /scan (recompute) then GET /trends
// Secret stays server-side. 502 on failure (no mock). Env: SOCIAL_RADAR_URL + N8N_SEO_SECRET.

export const dynamic = "force-dynamic";

function toFeId(site: string | undefined): string {
  if (!site) return "";
  if (siteById(site) || site === "network/other") return site;
  return siteBySeoKey(site)?.id ?? site;
}

function mapTrend(t: RadarTrend): RadarTrend {
  return {
    ...t,
    suggestedBrands: (t.suggestedBrands ?? []).map((b) => ({ ...b, site: toFeId(b.site) })),
  };
}

function config(): { url: string; secret: string } | { error: string } {
  const url = process.env.SOCIAL_RADAR_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) return { error: "SOCIAL_RADAR_URL / N8N_SEO_SECRET not configured" };
  return { url: url.replace(/\/$/, ""), secret };
}

function scopeOf(req: Request): string {
  const s = new URL(req.url).searchParams.get("scope");
  return s === "global" ? "global" : "greece";
}

async function fetchTrends(url: string, secret: string, scope: string): Promise<RadarTrend[]> {
  const res = await fetch(`${url}/trends?scope=${scope}`, {
    method: "GET",
    headers: { "x-matrix-secret": secret },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`social-radar responded ${res.status}`);
  const raw = (await res.json()) as { trends?: RadarTrend[] };
  return (raw.trends ?? []).map(mapTrend);
}

export async function GET(req: Request) {
  const cfg = config();
  if ("error" in cfg) return NextResponse.json({ error: cfg.error }, { status: 502 });
  try {
    return NextResponse.json(await fetchTrends(cfg.url, cfg.secret, scopeOf(req)));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "trend-radar proxy failed" },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  const cfg = config();
  if ("error" in cfg) return NextResponse.json({ error: cfg.error }, { status: 502 });
  try {
    // recompute (both scopes) then read back the requested scope
    const scan = await fetch(`${cfg.url}/scan`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-matrix-secret": cfg.secret },
      body: "{}",
      cache: "no-store",
    });
    if (!scan.ok) return NextResponse.json({ error: `social-radar responded ${scan.status}` }, { status: 502 });
    return NextResponse.json(await fetchTrends(cfg.url, cfg.secret, scopeOf(req)));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "trend-radar scan failed" },
      { status: 502 },
    );
  }
}
