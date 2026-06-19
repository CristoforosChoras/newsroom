import { NextResponse } from "next/server";

// Server-only proxy to the Social Radar "Competition Analysis" endpoints.
// POST  → start a run ({urls, socials?, windowHours?, profileIds?}) → {runId}
// GET ?runId= → poll a run → {run, findings};  GET (no id) → {runs} (recent)
// Secret stays server-side. 502 on failure (no mock).

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function config(): { url: string; secret: string } | { error: string } {
  const url = process.env.SOCIAL_RADAR_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) return { error: "SOCIAL_RADAR_URL / N8N_SEO_SECRET not configured" };
  return { url: url.replace(/\/$/, ""), secret };
}

async function pass(url: string, secret: string, init: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", "x-matrix-secret": secret },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: `social-radar responded ${res.status}` }, { status: 502 });
  }
  return NextResponse.json(await res.json());
}

export async function POST(req: Request) {
  const cfg = config();
  if ("error" in cfg) return NextResponse.json({ error: cfg.error }, { status: 502 });
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  try {
    return await pass(`${cfg.url}/competition/runs`, cfg.secret, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "competition proxy failed" },
      { status: 502 },
    );
  }
}

export async function GET(req: Request) {
  const cfg = config();
  if ("error" in cfg) return NextResponse.json({ error: cfg.error }, { status: 502 });
  const runId = new URL(req.url).searchParams.get("runId");
  const path = runId
    ? `/competition/runs/${encodeURIComponent(runId)}`
    : `/competition/runs`;
  try {
    return await pass(`${cfg.url}${path}`, cfg.secret, { method: "GET" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "competition proxy failed" },
      { status: 502 },
    );
  }
}
