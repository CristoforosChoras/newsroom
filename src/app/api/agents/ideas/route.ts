import { NextResponse } from "next/server";
import type { Idea } from "@/lib/types";
import { siteBySeoKey, siteById } from "@/lib/config/sites";

// Server-only proxy to the standalone Social Radar service. Secret stays server-side.
// GET   → service GET /ideas    (read the stored board, filtered)
// POST  → service POST /scan    (recompute now → ranked ideas)
// PATCH → service POST /ideas/:id/state  ({ id, state } in body)
// 502 on failure (no mock). Env: SOCIAL_RADAR_URL + N8N_SEO_SECRET (shared secret).

export const dynamic = "force-dynamic";

// Service sites use FE ids already (profiles mirror sites.ts); keep mapping for
// safety + "network/other" passthrough.
function toFeId(site: string | undefined): string {
  if (!site) return "";
  if (site === "network/other") return site;
  if (siteById(site)) return site;
  return siteBySeoKey(site)?.id ?? site;
}

function mapIdea(i: Idea): Idea {
  return {
    ...i,
    site: toFeId(i.site),
    suggestedSites: i.suggestedSites?.map((s) => ({ ...s, site: toFeId(s.site) })),
  };
}

function config(): { url: string; secret: string } | { error: string } {
  const url = process.env.SOCIAL_RADAR_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    return { error: "SOCIAL_RADAR_URL / N8N_SEO_SECRET not configured" };
  }
  return { url: url.replace(/\/$/, ""), secret };
}

// Forward the FE query string (scope/type/format/state) to the service.
function passthroughQs(req: Request): string {
  const inQs = new URL(req.url).searchParams;
  const out = new URLSearchParams();
  for (const k of ["scope", "type", "format", "state"]) {
    const v = inQs.get(k);
    if (v) out.set(k, v);
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

async function proxy(
  target: string,
  secret: string,
  body?: unknown,
): Promise<{ ok: true; ideas: Idea[] } | { ok: false; error: string }> {
  const res = await fetch(target, {
    method: "POST",
    headers: { "content-type": "application/json", "x-matrix-secret": secret },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, error: `social-radar responded ${res.status}` };
  const text = await res.text();
  if (!text.trim()) return { ok: false, error: "social-radar returned an empty body" };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "social-radar returned non-JSON" };
  }
  const arr: Idea[] = Array.isArray(raw)
    ? (raw as Idea[])
    : ((raw as { ideas?: Idea[] }).ideas ?? []);
  return { ok: true, ideas: arr.map(mapIdea) };
}

async function readOrScan(req: Request, scan: boolean) {
  const cfg = config();
  if ("error" in cfg) return NextResponse.json({ error: cfg.error }, { status: 502 });
  try {
    const path = scan ? "/scan" : "/ideas";
    // /ideas is a GET on the service; emulate via fetch GET for reads.
    const qs = passthroughQs(req);
    if (scan) {
      const r = await proxy(`${cfg.url}/scan${qs}`, cfg.secret);
      return r.ok ? NextResponse.json(r.ideas) : NextResponse.json({ error: r.error }, { status: 502 });
    }
    const res = await fetch(`${cfg.url}${path}${qs}`, {
      method: "GET",
      headers: { "x-matrix-secret": cfg.secret },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: `social-radar responded ${res.status}` }, { status: 502 });
    const raw = (await res.json()) as { ideas?: Idea[] } | Idea[];
    const arr = Array.isArray(raw) ? raw : (raw.ideas ?? []);
    return NextResponse.json(arr.map(mapIdea));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ideas proxy failed" },
      { status: 502 },
    );
  }
}

export const GET = (req: Request) => readOrScan(req, false);
export const POST = (req: Request) => readOrScan(req, true);

// State write-back (assign / dismiss / seen).
export async function PATCH(req: Request) {
  const cfg = config();
  if ("error" in cfg) return NextResponse.json({ error: cfg.error }, { status: 502 });
  let body: { id?: string; state?: string };
  try {
    body = (await req.json()) as { id?: string; state?: string };
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!body.id || !body.state) {
    return NextResponse.json({ error: "id and state required" }, { status: 400 });
  }
  try {
    const res = await fetch(`${cfg.url}/ideas/${encodeURIComponent(body.id)}/state`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-matrix-secret": cfg.secret },
      body: JSON.stringify({ state: body.state }),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: `social-radar responded ${res.status}` }, { status: 502 });
    return NextResponse.json(await res.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "state proxy failed" },
      { status: 502 },
    );
  }
}
