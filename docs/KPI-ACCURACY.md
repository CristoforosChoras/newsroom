# KPI Accuracy — how we guarantee the numbers match GA4 Reports

The KPI dashboard is a **reporting** tool, not an estimate: on finalized data its
totals must match what you see in the **GA4 Reports** UI (not Explorations, which
can sample, and not raw BigQuery). This doc explains exactly how we keep them aligned
and how to verify it.

## Where the numbers come from
- **GA4 Data API v1** (`…/properties/{id}:runReport`), called from the n8n
  **"KPI Agent (MATRIX)"** with the service-account credential authorized on every
  property. The dashboard and the KPI report both read the **same** stored snapshot
  (`matrix_kpi` data table → `matrix-kpi` webhook), so they can never disagree.

## The accuracy rules (and why)
1. **Metric definitions = GA4's.** Users = **`activeUsers`** (the GA4 UI default), not
   `totalUsers`. We also pull `newUsers`, `sessions`, `engagedSessions`,
   `engagementRate`, `userEngagementDuration`, `screenPageViews`, `keyEvents`.
   Derived: avg engagement time = `userEngagementDuration / activeUsers`;
   conversion rate = `keyEvents / sessions`.
2. **Totals from the API, never summed from rows.** Each headline number comes from a
   **dimensionless** `runReport` (one row = the period total). We never add up daily
   rows for a headline.
3. **Users are non-summable.** A unique-user count for a period is **not** the sum of
   daily users — so period users come only from the single-range total query. (Daily
   series are shown for charts, but never summed into a user total.)
4. **Totals vs breakdowns are separate queries.** Clean totals carry no dimension;
   acquisition/pages/landing are separate calls. Adding a dimension changes
   granularity and can trigger the `(other)` bucket / thresholding.
5. **Period-over-period in one call.** Each totals query asks for the current **and**
   previous equal-length `dateRange`; deltas are computed from the two returned totals.
6. **Timezone.** We use relative dates (`today`/`yesterday`/`NdaysAgo`), so GA4 applies
   each property's own configured timezone automatically (verified: `Europe/Athens`).
7. **Sampling & thresholding are surfaced.** We read `metadata.samplingMetadatas`
   (sampling) and `metadata.subjectToThresholding` / `dataLossFromOtherRow` (a present
   `(other)` row) and raise a warning banner when either is set.
8. **Freshness / finality.** GA4 keeps processing for ~24–72h. Today & yesterday are
   marked **Preliminary**; days older than ~2 days are **Final** (per-day badges on the
   series). The KPI Agent runs **hourly** and re-queries the standard windows, so the
   trailing days **settle** to the UI numbers as Google finalizes them.
9. **Multi-property rollup.** `sessions`, `screenPageViews`, `keyEvents`,
   `engagedSessions` sum cleanly across sites. **`activeUsers` / `newUsers` do NOT** —
   a person visiting two of our sites counts on each. The network figure is shown as an
   **approximate sum (≈, not deduped)** and labeled as such in the UI; per-site numbers
   are exact.

## Window definitions (so you compare like-for-like)
| Window | Current range | Previous range |
|--------|---------------|----------------|
| today  | `today → today` | `yesterday → yesterday` |
| 7d     | `7daysAgo → yesterday` (7 complete days) | `14daysAgo → 8daysAgo` |
| 28d    | `28daysAgo → yesterday` (28 complete days) | `56daysAgo → 29daysAgo` |

> When checking against the GA4 Reports UI, set the report's date range to the **same**
> bounds. `today`/`7d`/`28d` all include the last 2 days, so they read **Preliminary**
> until those days finalize.

## How to verify (reconciliation)
Run the bundled script for a property + window:

```bash
# primary: query GA4 directly with the service-account key
GA4_SA_KEY_JSON=/path/to/sa-key.json node scripts/ga4-reconcile.mjs 343317259 7d

# fallback: read our stored snapshot via the KPI webhook
N8N_KPI_WEBHOOK_URL=… N8N_SEO_SECRET=… node scripts/ga4-reconcile.mjs 343317259 7d
```

Then, for the same property + range:
1. Open **GA4 → Reports** and read activeUsers / sessions / views / key events.
2. Open the **Query Explorer** (Analytics Data API) with the same metrics.
3. Confirm the three agree (on finalized days).

### Reconciliation results
| Property | Window | activeUsers | sessions | screenPageViews | keyEvents | Matches UI? |
|----------|--------|-------------|----------|-----------------|-----------|-------------|
| sportal (343317259) | 7d | _fill_ | _fill_ | _fill_ | _fill_ | _☐_ |

(Fill this in once you've run the comparison against your live UI — the live numbers
move daily, so we don't hard-code them here.)

## Reporting identity (advice — not changed silently)
Thresholding is worse when **Google Signals / demographics** are on and every query is
split by date. If headline totals are being suppressed, consider setting the property's
**Reporting Identity to "Device-based"** to reduce thresholding — but that's a tradeoff
(less cross-device dedup). We **do not** change this setting for you; decide per property.

## Known limitations (v1)
- Windows are presets (`today`/`7d`/`28d`); arbitrary custom ranges would need an
  on-demand live query path (v2) — the dashboard reads DB snapshots, not the live API.
- Network avg-engagement-time is shown as `—` (it isn't summable across properties).
- Revenue/currency metrics are out of scope (no revenue tracked yet).
- WP article counts are currently unavailable (`articles: 0`) — unrelated to GA4.
