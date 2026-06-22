import { NextResponse } from "next/server";

// Proxy: generate a per-brand suggested angle for a competition finding.
// POST { runId, findingId, profileIds } → { findingId, drafts }.

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: Request) {
  const url = process.env.SOCIAL_RADAR_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return NextResponse.json(
      { error: "SOCIAL_RADAR_URL / N8N_SEO_SECRET not configured" },
      { status: 502 },
    );
  }
  let body: { runId?: string; findingId?: string; profileIds?: string[] } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const { runId, findingId, profileIds } = body;
  if (!runId || !findingId || !Array.isArray(profileIds) || profileIds.length === 0) {
    return NextResponse.json({ error: "runId, findingId, profileIds required" }, { status: 400 });
  }
  try {
    const res = await fetch(
      `${url.replace(/\/$/, "")}/competition/runs/${encodeURIComponent(runId)}/findings/${encodeURIComponent(findingId)}/generate`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-matrix-secret": secret },
        body: JSON.stringify({ profileIds }),
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return NextResponse.json({ error: `social-radar responded ${res.status}` }, { status: 502 });
    }
    return NextResponse.json(await res.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "competition generate failed" },
      { status: 502 },
    );
  }
}
