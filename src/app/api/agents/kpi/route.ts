import { NextResponse } from "next/server";
import type { NetworkState, SiteKpi } from "@/lib/types";
import { siteBySeoKey, siteById } from "@/lib/config/sites";

// Server-only proxy to the n8n "KPI API" webhook → real network/per-site metrics
// (GA4 pageviews + WP REST article counts). Maps site keys → FE ids. 502 on
// failure (no mock). Env: N8N_KPI_WEBHOOK_URL + N8N_SEO_SECRET.

export const dynamic = "force-dynamic";

interface KpiPayload {
  siteKpi: Record<string, SiteKpi>;
  network: NetworkState;
  generatedAt?: number;
}

function toFeId(site: string): string {
  if (siteById(site)) return site;
  return siteBySeoKey(site)?.id ?? site;
}

async function fetchKpi() {
  const url = process.env.N8N_KPI_WEBHOOK_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return { ok: false as const, error: "N8N_KPI_WEBHOOK_URL / N8N_SEO_SECRET not configured" };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-matrix-secret": secret },
    body: JSON.stringify({}),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false as const, error: `n8n responded ${res.status}` };
  const text = await res.text();
  if (!text.trim()) return { ok: false as const, error: "n8n returned an empty body" };
  let raw: KpiPayload;
  try {
    raw = JSON.parse(text) as KpiPayload;
  } catch {
    return { ok: false as const, error: "n8n returned non-JSON" };
  }
  // normalize site keys → FE ids
  const siteKpi: Record<string, SiteKpi> = {};
  for (const [k, v] of Object.entries(raw.siteKpi ?? {})) siteKpi[toFeId(k)] = v;
  const network: NetworkState = raw.network ?? { week: [], sources: [], topArticles: [] };
  network.topArticles = (network.topArticles ?? []).map((a) => ({
    ...a,
    site: toFeId(a.site),
  }));
  return { ok: true as const, payload: { siteKpi, network, generatedAt: raw.generatedAt ?? 0 } };
}

async function handle() {
  try {
    const r = await fetchKpi();
    if (r.ok) return NextResponse.json(r.payload);
    return NextResponse.json({ error: r.error }, { status: 502 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "kpi proxy failed" },
      { status: 502 },
    );
  }
}

export const POST = handle;
export const GET = handle;
