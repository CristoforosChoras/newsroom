import { NextResponse } from "next/server";
import type { TrendResearch } from "@/lib/types";

// Server-only proxy: research WHY a trend is trending now (Claude web search, via
// Social Radar). POST { trendId } → service POST /trends/:id/research.
// Env: SOCIAL_RADAR_URL + N8N_SEO_SECRET.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = process.env.SOCIAL_RADAR_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return NextResponse.json({ error: "SOCIAL_RADAR_URL / N8N_SEO_SECRET not configured" }, { status: 502 });
  }
  let body: { trendId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  if (!body.trendId) return NextResponse.json({ error: "trendId required" }, { status: 400 });
  try {
    const res = await fetch(
      `${url.replace(/\/$/, "")}/trends/${encodeURIComponent(body.trendId)}/research`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-matrix-secret": secret },
        body: "{}",
        cache: "no-store",
      },
    );
    if (!res.ok) return NextResponse.json({ error: `social-radar responded ${res.status}` }, { status: 502 });
    const data = (await res.json()) as { research?: TrendResearch };
    return NextResponse.json({ research: data.research ?? null });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "trend-research proxy failed" },
      { status: 502 },
    );
  }
}
