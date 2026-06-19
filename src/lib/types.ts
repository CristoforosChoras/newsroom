// Domain types for the MATRIX Newsroom Core frontend.
// UI strings are Greek; code/types are English.

export type Vertical =
  | "sports"
  | "betting"
  | "auto"
  | "entertainment"
  | "lifestyle"
  | "politics";

// Board v2 — 5-stage flow. Two distinct people own a cell across the stages:
// the assignee (writer, owns inbox→ai_draft) and the reviewer (editor, review).
export type ColumnId =
  | "inbox"
  | "assigned"
  | "ai_draft"
  | "review"
  | "published";

// Social board — a separate lifecycle for social posts/reels. Distinct ids from
// ColumnId so a cell's status unambiguously identifies its board + column.
export type SocialColumnId =
  | "idea"
  | "composing"
  | "approval"
  | "scheduled"
  | "posted";

// A cell is either an "article" (long-form, WP + SEO gate) or a "social" post.
// Missing kind = "article" everywhere (back-compat for persisted v4 cells).
export type CellKind = "article" | "social";

// Any board column id. `Cell.status` is one of these; which set is valid depends
// on `Cell.kind` (article → ColumnId, social → SocialColumnId).
export type Stage = ColumnId | SocialColumnId;

export type Urgency = "breaking" | "standard" | "evergreen";
export type Status = "green" | "amber" | "red";
export type Scope = "all" | string; // "all" | site id

export type Role = "writer" | "editor" | "lead";
export interface User {
  id: string;
  name: string;
  role: Role;
  sites: string[]; // site ids this person works on ("*" = all)
  available?: boolean; // round-robin skips unavailable writers
}

export interface Site {
  id: string;
  name: string;
  vertical: Vertical;
  color: string; // brand hex
  wp: string; // e.g. "sportal.gr"
  wpCat: string; // mapped WordPress category
  kw: string[]; // routing keywords the router leans on
  seoKey?: string; // n8n `site` column value (SEO agent), if audited
  autoDraft?: boolean; // assignment immediately advances to ai_draft (default off)
}

export interface Cell {
  id: string;
  headline: string;
  source: string;
  site: string | null; // assigned WP site id, null = unrouted
  confidence: number | null; // routing confidence 0-100
  routeReason: string;
  urgency: Urgency;
  status: Stage;
  kind?: CellKind; // missing = "article" (back-compat); "social" → Social board
  // social-cell fields (kind === "social"; optional → article cells omit them):
  platform?: string; // instagram / tiktok / x / facebook / reel …
  caption?: string; // the post body
  hashtags?: string[];
  scheduledAt?: number | null; // when "Έγκριση & Προγραμματισμός" set a time
  trendTitle?: string; // provenance: the radar trend this idea came from
  createdAt: number;
  slaDeadline: number | null;
  event: string; // raw event description (router + draft input)
  titles: string[]; // AI SEO titles
  meta: string; // meta description
  keywords: string[]; // LSI keywords
  editor: string;
  wpPostId: number | null; // stamped on publish
  // article editor fields (optional; defaulted in makeCell + normalized on open):
  body?: string; // HTML from the rich editor
  slug?: string; // url slug, auto-derived from headline (greeklish)
  excerpt?: string; // defaults to meta
  featured?: string; // featured image URL
  tags?: string[]; // defaults to keywords
  seoTitle?: string; // Yoast-style, defaults to headline
  seoDesc?: string; // defaults to meta
  category?: string; // primary WP category, defaults to site.wpCat
  // wire-ingestion provenance (AMNA / ΑΠΕ-ΜΠΕ etc.): the original link + cleaned
  // source text kept for editor verification. The published body stays the rewrite.
  originalUrl?: string; // link to the original article (shown in the drawer)
  originalId?: string; // source's unique id → dedup on pull
  sourceText?: string; // cleaned original text — REFERENCE ONLY, not for publishing
  // ── Board v2: two-person ownership ──
  assignee: string | null; // writer (User id) — owns inbox→ai_draft
  reviewer: string | null; // editor (User id) — set entering review; ≠ assignee
  assignedAt: number | null;
  submittedAt: number | null; // when the writer pushed to review
  aiVersion: number; // increments on (re)generate; AMNA draft starts at 1
  editorNotes: { by: string; text: string; at: number }[]; // from send-backs
  returnedFromReview: boolean; // "↩ με σχόλια" badge
  promo: {
    wpPostId: number | null;
    social: boolean;
    newsletter: boolean;
  } | null; // set on publish
  // transient UI flags (stripped before persist):
  _routing?: boolean;
  _drafting?: boolean;
  _publishing?: boolean;
}

export type GateSeverity = "critical" | "improve";

export interface GateBlocker {
  id: string;
  label: string; // Greek, user-facing
  severity: GateSeverity;
}

export interface GateResult {
  status: Status; // red = a critical blocker, amber = only improvements, green = clean
  blockers: GateBlocker[];
}

export type TrendLifecycle = "emerging" | "surging" | "peaking" | "fading";

export interface Trend {
  id: string;
  topic: string;
  site: string; // primary FE site id (back-compat)
  velocity: number; // 0–100 (normalized z-score, NOT raw counts)
  platform: string; // back-compat summary string (e.g. "google · tiktok")
  note: string;
  // richer fields from the real Trend Radar backend (all optional → back-compat):
  entities?: { type: string; name: string }[];
  lifecycle?: TrendLifecycle;
  platforms?: string[]; // ["google","youtube","tiktok",...] → corroboration
  suggestedSites?: { site: string; confidence: number }[];
  coverage?: { status: "gap" | "partial" | "covered"; freshestUrl: string | null };
  angleGr?: string; // LLM-suggested Greek angle
  sparkline?: number[]; // velocity history
  sampledAt?: number;
  evidence?: string[]; // source URLs
}

export type IdeaType = "trend" | "gap" | "both";
export type IdeaState =
  | "new"
  | "seen"
  | "assigned"
  | "published"
  | "dismissed";

// The Social Radar engine's output object (one engine for trends + gaps).
// The FE consumes it via /api/agents/ideas and projects it onto Trend / Gap.
export interface Idea {
  id: string;
  title: string;
  entities: { type: string; name: string }[];
  demand: number; // 0–100
  demandSignal: string; // sourced, Greek
  demandType: "trend" | "striking_distance" | "question" | "decay" | "volume";
  velocity: number; // 0–100
  lifecycle: TrendLifecycle;
  platforms: string[];
  supply: {
    greekArticleExists: boolean;
    serpStrength: "thin" | "medium" | "strong";
    ourCoverage: "none" | "weak" | "covered";
    freshestUrl: string | null;
  };
  ideaType: IdeaType;
  suggestedSites: { site: string; confidence: number; reason: string }[];
  site: string; // primary FE site id (or "network/other")
  assignmentReason: string;
  format: "article" | "video" | "post";
  winnability: number; // 0–1
  score: number; // 0–100
  angleGr: string;
  briefGr: string;
  crossMedia: boolean;
  sources: string[];
  state: IdeaState;
  sampledAt: number;
}

export interface Gap {
  id: string;
  idea: string;
  type: "article" | "video" | "post";
  site: string;
  demand: number;
  reason: string;
  // richer fields projected from a Social Radar Idea (all optional → back-compat):
  ideaType?: IdeaType;
  demandSignal?: string;
  winnability?: number; // 0–1
  angleGr?: string;
  briefGr?: string;
  crossMedia?: boolean;
  lifecycle?: TrendLifecycle;
  platforms?: string[];
  suggestedSites?: { site: string; confidence: number }[];
  coverage?: { status: "gap" | "partial" | "covered"; freshestUrl: string | null };
  sources?: string[];
  state?: IdeaState;
  sampledAt?: number;
}

export interface RetroIssue {
  id: string;
  class: GateSeverity; // critical | improve
  label: string; // Greek
  count: number;
  of: number;
  exampleUrls?: string[];
}

export interface RetroOffender {
  url: string;
  issues: string[];
  cellId?: string | null;
}

export interface Report {
  id: string;
  type: "seo" | "kpi" | "seo_retro";
  site: Scope;
  date: number;
  status: Status;
  body: string[];
  // seo_retro extras (optional):
  volume?: { published: number; audited: number; skippedPartner: number };
  issues?: RetroIssue[];
  offenders?: RetroOffender[];
  lessons?: string[];
  // kpi snapshot (optional) — the GA4/WP figures at report time, for a clean table:
  kpi?: { siteKpi: Record<string, SiteKpi>; network: NetworkState };
}

export interface Agent {
  id: string;
  name: string;
  on: boolean;
  schedule: string;
  last: number | null;
  desc: string;
}

// ── GA4 KPI (accurate, matches the GA4 Reports UI) ──
export type Finality = "preliminary" | "final";
export interface KpiFlags {
  sampled: boolean;
  thresholded: boolean;
}
// One window's headline metrics for a site (from a dimensionless GA4 total query).
export interface KpiMetrics {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  engagedSessions: number;
  engagementRate: number; // 0..1
  screenPageViews: number;
  keyEvents: number;
  avgEngagementTime: number; // seconds
  conversionRate: number; // keyEvents / sessions
  deltas: Record<string, number>; // % vs previous equal-length period, per metric
  finality: Finality;
}
export interface KpiSeriesPoint {
  date: string; // YYYYMMDD
  screenPageViews: number;
  sessions: number;
  activeUsers: number;
  finality: Finality;
}
export interface KpiChannel {
  channel: string;
  sessions: number;
  activeUsers?: number;
}
export interface KpiTopPage {
  title: string;
  path: string;
  views: number;
}
export interface KpiLanding {
  landingPage: string;
  sessions: number;
}

export interface SiteKpi {
  views: number; // pageviews TODAY (back-compat; = today screenPageViews)
  views7d?: number; // 7-day total (context)
  delta: number; // % today vs yesterday (back-compat; = 7d screenPageViews delta)
  articles: number;
  seo: Status;
  wp: boolean;
  // ── enriched GA4 fields (optional → back-compat with old/empty snapshots) ──
  byWindow?: Record<string, KpiMetrics>; // "today" | "7d" | "28d"
  series?: Record<string, KpiSeriesPoint[]>; // per window (7d, 28d)
  channels?: Record<string, KpiChannel[]>;
  topPages?: Record<string, KpiTopPage[]>;
  topLanding?: Record<string, KpiLanding[]>;
  timezone?: string; // property timezone (from GA4 metadata)
}

export interface SeoState {
  status: Status;
  checkedAt: number | null;
  items: { k: string; v: string; s: Status }[];
  actions: string[];
}

// Network rollup for one window. Summable metrics sum cleanly across properties;
// activeUsers/newUsers do NOT (a person on two sites counts twice) → "approx".
export interface NetworkWindow {
  totals: {
    sessions: number;
    screenPageViews: number;
    keyEvents: number;
    engagedSessions: number;
  };
  activeUsersApprox: number;
  newUsersApprox: number;
  deltas: Record<string, number>;
  finality: Finality;
}

export interface NetworkState {
  week: { d: string; v: number; date?: string; finality?: Finality }[]; // daily network pageviews (in K)
  sources: { s: string; p: number }[];
  topArticles: { t: string; v: number; site: string }[];
  delta?: number; // network % today vs yesterday
  today?: number; // network pageviews today (raw)
  // ── enriched (optional → back-compat) ──
  byWindow?: Record<string, NetworkWindow>;
  channels?: { channel: string; sessions: number }[]; // network acquisition (7d)
}

// Snapshot-level KPI metadata (freshness + flags), surfaced in the dashboard.
export interface KpiMeta {
  generatedAt: number;
  lastUpdated: number;
  windows: string[]; // e.g. ["today","7d","28d"]
  defaultWindow: string;
  flags: KpiFlags;
  finalityByWindow: Record<string, Finality>;
}

export interface NewsroomState {
  scope: Scope;
  currentUser: string; // dev current-user switcher (User id) — gates role actions
  cells: Cell[];
  trends: Trend[];
  gaps: Gap[];
  reports: Report[];
  agents: Agent[];
  siteKpi: Record<string, SiteKpi>;
  seo: SeoState;
  network: NetworkState;
  kpiMeta: KpiMeta | null; // freshness + sampling/threshold flags (null until first run)
}

// ── Trend Radar (unfiltered Global/Greece feed + per-brand idea generator) ──
export type TrendScope = "greece" | "global";

export interface RadarTrend {
  id: string;
  scope: TrendScope;
  category: string; // topic bucket (sports/politics/entertainment/…)
  title: string;
  entities: { type: string; name: string }[];
  platforms: string[];
  sources: string[];
  thumbnail: string | null;
  metric: { kind: string; value: number };
  demand: number;
  velocity: number;
  recency: number;
  crossPlatform: number;
  score: number;
  lifecycle: TrendLifecycle;
  sampledAt: number;
  suggestedBrands: { site: string; confidence: number; reason: string }[];
}

export interface GeneratedIdeas {
  socialPosts: { platform: string; hook: string; caption: string; hashtags: string[] }[];
  article: {
    headline: string;
    outline: string[];
    draft: string;
    // richer SEO package (optional → old cached drafts / template fallback omit
    // them; the FE derives fallbacks so the article cell is always "full").
    seoTitles?: string[]; // alternative titles to choose from
    meta?: string; // 150–160 char meta description
    keywords?: string[]; // LSI keywords / tags
  };
  shortVideo: { hook: string; script: string };
}

export interface TrendIdeaDraft {
  id: string;
  trendId: string;
  profileId: string;
  ideas: GeneratedIdeas;
  createdAt: number;
}

export interface TrendResearch {
  whyTrending: string;
  entityType: "person" | "event" | "product" | "place" | "other";
  summary: string;
  sources: { title: string; url: string }[];
  researchedAt: number;
}

// ── Competition Analysis (on-demand competitor scout) ──
export type CompetitionRunStatus = "pending" | "running" | "done" | "error";
export type CompetitionFindingType = "missed" | "behind";

export interface CompetitionSourceStatus {
  url: string;
  ok: boolean;
  reason?: string;
  count: number;
}

export interface CompetitorSummary {
  url: string;
  articleCount: number;
  cadencePerDay: number;
  topTopics: string[];
}

export interface CompetitionFinding {
  id: string;
  runId: string;
  type: CompetitionFindingType; // missed | behind
  topic: string;
  headline: string;
  whyItMatters: string;
  competitors: { url: string; title: string; publishedAt: number | null }[];
  metrics: { competitorCount: number; earliestPublishedAt: number | null; engagement?: number | null };
  profileFit: string[]; // brand site ids
  score: number;
}

export interface CompetitionRun {
  id: string;
  status: CompetitionRunStatus;
  urls: string[];
  socials: string[];
  windowHours: number;
  profileIds: string[];
  progress: { phase: string; done: number; total: number };
  sources: CompetitionSourceStatus[];
  competitorSummaries: CompetitorSummary[];
  socialStatus: "unavailable" | "ok";
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CompetitionDraft {
  id: string;
  findingId: string;
  profileId: string;
  ideas: GeneratedIdeas;
  createdAt: number;
}
