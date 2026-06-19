#!/usr/bin/env node
// GA4 reconciliation — proves the dashboard's numbers match the GA4 Reports UI.
//
// It queries the GA4 Data API the SAME accurate way the n8n KPI Agent does
// (dimensionless totals, current + previous date ranges, property timezone via
// relative dates) and prints the headline metrics so you can compare them against
// the GA4 Reports UI and the Query Explorer for the same property + range.
//
// Usage:
//   node scripts/ga4-reconcile.mjs <propertyId> [today|7d|28d]
//   node scripts/ga4-reconcile.mjs 343317259 7d
//
// Auth (primary): set GA4_SA_KEY_JSON to the service-account key — either the raw
//   JSON or a path to the .json file. Needs the Analytics Data API read scope.
// Fallback (no key): set N8N_KPI_WEBHOOK_URL + N8N_SEO_SECRET and the script reads
//   the stored snapshot from our KPI webhook instead (then compare to the UI).
//
// Zero dependencies — uses Node's built-in crypto + fetch (Node 18+).

import crypto from "node:crypto";
import { readFileSync } from "node:fs";

const PROPERTIES = {
  sportal: "343317259",
  outsidersbet: "382629420",
  onlyauto: "531541456",
  exodos: "382621626",
  klik: "516920776",
  muse: "521136752",
};

const WIN = {
  today: { cur: ["today", "today"], prev: ["yesterday", "yesterday"] },
  "7d": { cur: ["7daysAgo", "yesterday"], prev: ["14daysAgo", "8daysAgo"] },
  "28d": { cur: ["28daysAgo", "yesterday"], prev: ["56daysAgo", "29daysAgo"] },
};

const METRICS = [
  "activeUsers",
  "newUsers",
  "sessions",
  "engagedSessions",
  "engagementRate",
  "userEngagementDuration",
  "screenPageViews",
  "keyEvents",
];

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function loadKey() {
  const raw = process.env.GA4_SA_KEY_JSON;
  if (!raw) return null;
  const text = raw.trim().startsWith("{") ? raw : readFileSync(raw, "utf8");
  const k = JSON.parse(text);
  if (!k.client_email || !k.private_key) throw new Error("GA4_SA_KEY_JSON missing client_email/private_key");
  return k;
}

async function getToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(key.private_key));
  const jwt = `${header}.${claim}.${sig}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`token error ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function runReport(token, propertyId, win) {
  const body = {
    dateRanges: [
      { startDate: win.cur[0], endDate: win.cur[1] },
      { startDate: win.prev[0], endDate: win.prev[1] },
    ],
    metrics: METRICS.map((name) => ({ name })),
  };
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`runReport error ${res.status}: ${await res.text()}`);
  return res.json();
}

function pick(rows, idx) {
  const row = rows.find((r) => r.dimensionValues?.[0]?.value === `date_range_${idx}`) || rows[idx];
  const mv = row?.metricValues || [];
  const o = {};
  METRICS.forEach((m, k) => (o[m] = Number(mv[k]?.value) || 0));
  return o;
}

function fmt(n) {
  return typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-US") : String(n);
}

async function viaApi(propertyId, windowKey) {
  const key = loadKey();
  if (!key) return false;
  const win = WIN[windowKey];
  const token = await getToken(key);
  const r = await runReport(token, propertyId, win);
  const meta = r.metadata || {};
  const cur = pick(r.rows || [], 0);
  const prev = pick(r.rows || [], 1);

  console.log(`\nGA4 Data API — property ${propertyId} — window "${windowKey}"`);
  console.log(`  current : ${win.cur[0]} → ${win.cur[1]}`);
  console.log(`  previous: ${win.prev[0]} → ${win.prev[1]}`);
  console.log(`  timezone: ${meta.timeZone || "?"}   currency: ${meta.currencyCode || "-"}`);
  console.log(`  sampled : ${!!(meta.samplingMetadatas && meta.samplingMetadatas.length)}   thresholded: ${!!(meta.subjectToThresholding || meta.dataLossFromOtherRow)}`);
  console.log("\n  metric                     current        previous       Δ%");
  console.log("  " + "-".repeat(62));
  for (const m of METRICS) {
    const a = cur[m], b = prev[m];
    const d = b ? (((a - b) / b) * 100).toFixed(1) : "—";
    console.log("  " + m.padEnd(24) + " " + fmt(a).padStart(13) + "  " + fmt(b).padStart(13) + "  " + String(d).padStart(6));
  }
  console.log("\n  derived: avgEngagementTime = " + (cur.activeUsers ? (cur.userEngagementDuration / cur.activeUsers).toFixed(1) : 0) + "s" +
    "   conversionRate = " + (cur.sessions ? ((cur.keyEvents / cur.sessions) * 100).toFixed(1) : 0) + "%");
  console.log("\n  ✔ Compare these against GA4 → Reports (set the SAME date range), and the");
  console.log("    Query Explorer (analyticsdata) with the same property + metrics.");
  console.log("    Users = activeUsers (the GA4 UI default). Totals are read from the API,");
  console.log("    NOT summed from daily rows (users are non-summable).");
  return true;
}

async function viaWebhook(propertyId, windowKey) {
  const url = process.env.N8N_KPI_WEBHOOK_URL;
  const secret = process.env.N8N_SEO_SECRET;
  if (!url || !secret) {
    console.error(
      "No GA4_SA_KEY_JSON and no N8N_KPI_WEBHOOK_URL/N8N_SEO_SECRET — set one to run.",
    );
    process.exit(1);
  }
  const site = Object.keys(PROPERTIES).find((s) => PROPERTIES[s] === propertyId) || propertyId;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-matrix-secret": secret },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`webhook ${res.status}`);
  const data = await res.json();
  const m = data.siteKpi?.[site]?.byWindow?.[windowKey];
  console.log(`\n(Fallback) stored snapshot via KPI webhook — site "${site}" window "${windowKey}"`);
  if (!m) {
    console.log("  No window data in the snapshot. Run the KPI Agent first.");
    return;
  }
  for (const k of Object.keys(m)) {
    if (k === "deltas") continue;
    console.log("  " + k.padEnd(24) + " " + fmt(m[k]));
  }
  console.log("\n  Now open GA4 → Reports for the same range and confirm the figures match.");
}

const propertyId = process.argv[2] || PROPERTIES.sportal;
const windowKey = process.argv[3] || "7d";
if (!WIN[windowKey]) {
  console.error(`Unknown window "${windowKey}". Use: today | 7d | 28d`);
  process.exit(1);
}

(async () => {
  try {
    const did = await viaApi(propertyId, windowKey);
    if (!did) await viaWebhook(propertyId, windowKey);
  } catch (e) {
    console.error("Reconcile failed:", e.message);
    process.exit(1);
  }
})();
