import { NextResponse } from "next/server";
import { siteById } from "@/lib/config/sites";

// Server-only proxy to the n8n "Story Draft API" webhook (Claude writer).
// Resolves the cell's site id → {id,name,vertical,wpCat} for editorial voice,
// then passes the draft JSON through. 502 on failure (no mock).
// Env: N8N_DRAFT_WEBHOOK_URL + N8N_SEO_SECRET.

export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const url = process.env.N8N_DRAFT_WEBHOOK_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return NextResponse.json(
      { error: "N8N_DRAFT_WEBHOOK_URL / N8N_SEO_SECRET not configured" },
      { status: 502 },
    );
  }
  let body: {
    headline?: string;
    event?: string;
    source?: string;
    sourceText?: string;
    site?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const s = siteById(body.site ?? null);
  const site = s
    ? { id: s.id, name: s.name, vertical: s.vertical, wpCat: s.wpCat }
    : null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-matrix-secret": secret },
      body: JSON.stringify({ ...body, site }),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `n8n responded ${res.status}` }, { status: 502 });
    }
    const text = await res.text();
    if (!text.trim()) {
      return NextResponse.json({ error: "n8n returned an empty body" }, { status: 502 });
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "n8n returned non-JSON" }, { status: 502 });
    }
    return NextResponse.json(raw);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "draft proxy failed" },
      { status: 502 },
    );
  }
}

export const POST = handle;
