import { NextResponse } from "next/server";
import type { Status } from "@/lib/types";

// Server-only proxy to the n8n "SEO Report API" webhook. Secrets stay here and
// never reach the browser. Maps the canonical n8n report → the FE SeoResult shape.
// No mock/fallback: if n8n is unavailable we return 502 (the FE shows an error,
// never fabricated data).
// Env: N8N_SEO_WEBHOOK_URL + N8N_SEO_SECRET.

export const dynamic = "force-dynamic";

interface N8nPerSite {
  status: Status;
  [k: string]: unknown;
}
interface N8nReport {
  status: Status;
  actions: string[];
  generatedAt?: number;
  items?: { k: string; v: string; s: Status }[];
  perSite?: Record<string, N8nPerSite>;
}

async function fetchReport() {
  const url = process.env.N8N_SEO_WEBHOOK_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return { ok: false as const, error: "N8N_SEO_WEBHOOK_URL / N8N_SEO_SECRET not configured" };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-matrix-secret": secret },
    body: "{}",
    cache: "no-store",
  });
  if (!res.ok) return { ok: false as const, error: `n8n responded ${res.status}` };

  const text = await res.text();
  if (!text.trim()) {
    return { ok: false as const, error: "n8n returned an empty body" };
  }
  let data: N8nReport;
  try {
    data = JSON.parse(text) as N8nReport;
  } catch {
    return { ok: false as const, error: "n8n returned non-JSON" };
  }
  if (!data || !data.status || !Array.isArray(data.actions)) {
    return { ok: false as const, error: "unexpected n8n payload" };
  }

  const perSite: Record<string, Status> = {};
  for (const [id, v] of Object.entries(data.perSite ?? {})) {
    if (v && v.status) perSite[id] = v.status;
  }

  return {
    ok: true as const,
    report: {
      status: data.status,
      actions: data.actions,
      checkedAt: data.generatedAt ?? Date.now(),
      items: data.items ?? [],
      perSite,
      source: "n8n" as const,
    },
  };
}

async function handle() {
  try {
    const result = await fetchReport();
    if (result.ok) return NextResponse.json(result.report);
    return NextResponse.json({ error: result.error }, { status: 502 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "seo proxy failed" },
      { status: 502 },
    );
  }
}

export const POST = handle;
export const GET = handle; // convenience for manual curl checks
