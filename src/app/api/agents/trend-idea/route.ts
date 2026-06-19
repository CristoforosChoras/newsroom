import { NextResponse } from "next/server";
import type { TrendIdeaDraft, TrendResearch } from "@/lib/types";

// Server-only proxy: generate per-brand content ideas for a trend (Claude, via
// Social Radar). POST { trendId, profileIds[] } → service POST /trends/:id/generate.
// 502 on failure (no mock). Env: SOCIAL_RADAR_URL + N8N_SEO_SECRET.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = process.env.SOCIAL_RADAR_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return NextResponse.json({ error: "SOCIAL_RADAR_URL / N8N_SEO_SECRET not configured" }, { status: 502 });
  }
  let body: { trendId?: string; profileIds?: string[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  if (!body.trendId || !Array.isArray(body.profileIds) || body.profileIds.length === 0) {
    return NextResponse.json({ error: "trendId and profileIds required" }, { status: 400 });
  }
  try {
    const res = await fetch(
      `${url.replace(/\/$/, "")}/trends/${encodeURIComponent(body.trendId)}/generate`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-matrix-secret": secret },
        body: JSON.stringify({ profileIds: body.profileIds }),
        cache: "no-store",
      },
    );
    if (!res.ok) return NextResponse.json({ error: `social-radar responded ${res.status}` }, { status: 502 });
    const data = (await res.json()) as { drafts?: TrendIdeaDraft[]; research?: TrendResearch };
    return NextResponse.json({ drafts: data.drafts ?? [], research: data.research ?? null });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "trend-idea proxy failed" },
      { status: 502 },
    );
  }
}
