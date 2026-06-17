import { NextResponse } from "next/server";
import type { Status, RetroIssue, RetroOffender } from "@/lib/types";

// Server-only proxy to the n8n "SEO Retro API" webhook (yesterday's per-site audit).
// Mirrors /api/agents/seo: secret stays server-side; 502 on failure (no mock).
// Env: N8N_SEO_RETRO_WEBHOOK_URL + N8N_SEO_SECRET (shared).

export const dynamic = "force-dynamic";

export interface RetroSite {
  grade: Status;
  volume?: { published: number; audited: number; skippedPartner: number };
  issues: RetroIssue[];
  offenders?: RetroOffender[];
  lessons?: string[];
}
export interface RetroResult {
  source?: "n8n" | "mock";
  generatedAt: number;
  day: string;
  sites: Record<string, RetroSite>;
  network?: { grade: Status };
}

async function fetchRetro(): Promise<
  { ok: true; report: RetroResult } | { ok: false; error: string }
> {
  const url = process.env.N8N_SEO_RETRO_WEBHOOK_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return { ok: false, error: "N8N_SEO_RETRO_WEBHOOK_URL / N8N_SEO_SECRET not configured" };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-matrix-secret": secret },
    body: "{}",
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, error: `n8n responded ${res.status}` };
  const text = await res.text();
  if (!text.trim()) return { ok: false, error: "n8n returned an empty body" };
  let data: RetroResult;
  try {
    data = JSON.parse(text) as RetroResult;
  } catch {
    return { ok: false, error: "n8n returned non-JSON" };
  }
  if (!data || !data.sites) return { ok: false, error: "unexpected n8n payload" };
  return { ok: true, report: { ...data, source: "n8n" } };
}

async function handle() {
  try {
    const r = await fetchRetro();
    if (r.ok) return NextResponse.json(r.report);
    return NextResponse.json({ error: r.error }, { status: 502 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "seo-retro proxy failed" },
      { status: 502 },
    );
  }
}

export const POST = handle;
export const GET = handle;
