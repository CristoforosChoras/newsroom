import { NextResponse } from "next/server";

// Server-only proxy to the n8n "AMNA Control API" webhook. GET reads the current
// ingestion cadence; POST sets it. The cadence (minutes) lives in n8n trend_config
// and gates the AMNA Ingest schedule branch — 0 / empty means manual-only.
// Secret stays server-side. Env: N8N_AMNA_CONFIG_WEBHOOK_URL + N8N_SEO_SECRET.

export const dynamic = "force-dynamic";

interface ConfigResult {
  intervalMin: number;
  lastRunMs: number;
}

async function call(payload: Record<string, unknown>) {
  const url = process.env.N8N_AMNA_CONFIG_WEBHOOK_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return NextResponse.json(
      { error: "N8N_AMNA_CONFIG_WEBHOOK_URL / N8N_SEO_SECRET not configured" },
      { status: 502 },
    );
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-matrix-secret": secret },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `n8n responded ${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as ConfigResult;
    return NextResponse.json({
      intervalMin: typeof data.intervalMin === "number" ? data.intervalMin : 0,
      lastRunMs: typeof data.lastRunMs === "number" ? data.lastRunMs : 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "config proxy failed" },
      { status: 502 },
    );
  }
}

export async function GET() {
  return call({ action: "get" });
}

export async function POST(req: Request) {
  let body: { intervalMin?: number | string | null } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  return call({ action: "set", intervalMin: body.intervalMin ?? null });
}
