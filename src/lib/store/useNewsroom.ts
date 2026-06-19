import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Agent,
  Cell,
  CellKind,
  Gap,
  IdeaState,
  NewsroomState,
  RadarTrend,
  Scope,
  Stage,
  Trend,
  TrendIdeaDraft,
  TrendResearch,
  TrendScope,
} from "@/lib/types";
import { SEED, makeCell } from "@/lib/data/seed";
import { siteById, siteBySeoKey } from "@/lib/config/sites";
import { userById, nextWriter, pickReviewer } from "@/lib/config/team";
import { slugify } from "@/lib/utils/slug";
import { routeContent } from "@/lib/services/router";
import { publishToWp } from "@/lib/services/wordpress";
import { publishToSocial } from "@/lib/services/social";
import { canPublish, criticalBlockers } from "@/lib/services/seoGate";
import {
  rerouteStory,
  generateDraft as generateDraftSvc,
  runSeoRetro as runSeoRetroSvc,
  scanTrends as scanTrendsSvc,
  findGaps as findGapsSvc,
  setIdeaState as setIdeaStateSvc,
  getInbox as getInboxSvc,
  runAmnaIngest as runAmnaIngestSvc,
  getKpi as getKpiSvc,
  getRadarTrends as getRadarTrendsSvc,
} from "@/lib/services/agents";

// A pending confirmation (drives the ConfirmDialog primitive). Holds a callback,
// so it lives in UI state only (never persisted).
export interface ConfirmRequest {
  message: string;
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface UiState {
  open: string | null; // cell id shown in the drawer
  editing: string | null; // cell id shown in the full-screen article editor
  toast: string | null;
  confirm: ConfirmRequest | null; // active confirmation dialog

  kpiWindow: string; // active KPI window ("today" | "7d" | "28d")
  boardKind: CellKind; // active newsroom board tab (article | social)
  // Trend Radar
  trendScope: TrendScope; // active tab (greece | global)
  radarTrends: RadarTrend[]; // currently loaded scope's feed
  trendIdea: string | null; // trend id shown in the idea-generator modal
  // Temporary (in-memory, session-only) cache of AI output per trend so it
  // survives page navigation and the user never pays to regenerate. NOT
  // persisted to disk → cleared on a full reload.
  trendDrafts: Record<string, TrendIdeaDraft[]>;
  trendResearch: Record<string, TrendResearch>;
  trendBrands: Record<string, string[]>; // remembered brand selection per trend
  usedTrends: string[]; // trend ids that produced a cell → marked (NOT removed) in the feed
}

interface Actions {
  setScope: (scope: Scope) => void;
  setBoardKind: (kind: CellKind) => void;
  setKpiWindow: (w: string) => void;
  addCell: () => string;
  removeCell: (id: string) => void;
  move: (id: string, status: Stage) => void;
  updateCell: (id: string, patch: Partial<Cell>) => void;
  reroute: (id: string) => Promise<void>;
  publishWP: (id: string) => Promise<void>;
  runSeoRetro: () => Promise<void>;
  runKPI: () => Promise<void>;
  scanTrends: () => Promise<void>;
  createCellFromTrend: (trend: Trend) => string;
  // Trend Radar (Global/Greece)
  setTrendScope: (scope: TrendScope) => void;
  loadRadar: (scope: TrendScope, scan?: boolean) => Promise<void>;
  openTrendIdea: (id: string) => void;
  closeTrendIdea: () => void;
  createCellFromRadarTrend: (trend: RadarTrend) => string;
  // Temporary idea caches (survive navigation; not persisted)
  cacheTrendDrafts: (trendId: string, drafts: TrendIdeaDraft[]) => void;
  cacheTrendResearch: (trendId: string, research: TrendResearch) => void;
  setTrendBrands: (trendId: string, ids: string[]) => void;
  markTrendUsed: (trendId: string) => void;
  // Per-idea "Create cell" from the Trend Radar modal (routes to the right board)
  createSocialCell: (o: {
    platform: string;
    headline: string;
    caption: string;
    hashtags?: string[];
    site: string | null;
    trendTitle?: string;
  }) => string;
  createArticleCellFromIdea: (o: {
    headline: string;
    body: string;
    titles?: string[];
    meta?: string;
    keywords?: string[];
    excerpt?: string;
    event?: string;
    sourceText?: string;
    site: string | null;
    trendTitle?: string;
  }) => string;
  // Social board transitions (Ιδέες→Σύνταξη→Έγκριση→Προγραμματισμένα→Δημοσιευμένα)
  composeSocial: (id: string) => void;
  submitSocialForApproval: (id: string) => void;
  approveSocialSchedule: (id: string, whenMs: number) => void;
  returnSocial: (id: string) => void;
  postSocial: (id: string) => Promise<void>;
  findGaps: (scope: Scope) => Promise<void>;
  createCellFromGap: (gap: Gap) => string;
  dismissGap: (id: string) => Promise<void>;
  pullInbox: () => Promise<number>;
  // Board v2 — two-person flow (role-guarded by currentUser)
  setCurrentUser: (userId: string) => void;
  assign: (id: string, writerId?: string) => void;
  generateDraft: (id: string) => Promise<void>;
  submitForReview: (id: string, editorId?: string) => void;
  sendBack: (id: string, note: string) => void;
  approveAndPublish: (id: string) => Promise<void>;
  reassign: (id: string, writerId: string) => void;
  toggleAgent: (id: string) => void;
  morning: () => Promise<void>;
  openCell: (id: string) => void;
  closeCell: () => void;
  askConfirm: (req: ConfirmRequest) => void;
  closeConfirm: () => void;
  openEditor: (id: string) => void;
  closeEditor: () => void;
  clearReports: () => void;
  flash: (msg: string) => void;
}

export type Store = NewsroomState & UiState & Actions;

// Stamp the given agent ids with last-run = now (pure helper).
function stamp(agents: Agent[], ids: string[]): Agent[] {
  const now = Date.now();
  return agents.map((a) => (ids.includes(a.id) ? { ...a, last: now } : a));
}

let flashTimer: ReturnType<typeof setTimeout> | null = null;

// Server-safe storage: with skipHydration the browser store rehydrates manually
// (see StoreHydration), so this guard mainly prevents accidental SSR access.
const storage = createJSONStorage<NewsroomState>(() => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return window.localStorage;
});

export const useNewsroom = create<Store>()(
  persist(
    (set, get) => ({
      ...SEED,
      open: null,
      editing: null,
      toast: null,
      confirm: null,
      kpiWindow: "7d",
      boardKind: "article",
      trendScope: "greece",
      radarTrends: [],
      trendIdea: null,
      trendDrafts: {},
      trendResearch: {},
      trendBrands: {},
      usedTrends: [],

      setScope: (scope) => set({ scope }),
      setBoardKind: (kind) => set({ boardKind: kind }),
      setKpiWindow: (w) => set({ kpiWindow: w }),

      cacheTrendDrafts: (trendId, drafts) =>
        set((s) => ({ trendDrafts: { ...s.trendDrafts, [trendId]: drafts } })),
      cacheTrendResearch: (trendId, research) =>
        set((s) => ({
          trendResearch: { ...s.trendResearch, [trendId]: research },
        })),
      setTrendBrands: (trendId, ids) =>
        set((s) => ({ trendBrands: { ...s.trendBrands, [trendId]: ids } })),
      markTrendUsed: (trendId) =>
        set((s) =>
          s.usedTrends.includes(trendId)
            ? {}
            : { usedTrends: [...s.usedTrends, trendId] },
        ),

      flash: (msg) => {
        set({ toast: msg });
        if (flashTimer) clearTimeout(flashTimer);
        flashTimer = setTimeout(() => set({ toast: null }), 2600);
      },

      openCell: (id) => set({ open: id }),
      closeCell: () => set({ open: null }),
      askConfirm: (req) => set({ confirm: req }),
      closeConfirm: () => set({ confirm: null }),
      clearReports: () => set({ reports: [] }),

      // Normalize editor fields from existing cell data (fill empties only),
      // then open the full-screen editor.
      openEditor: (id) => {
        const c = get().cells.find((x) => x.id === id);
        if (!c) return;
        const s = siteById(c.site ?? null);
        set((st) => ({
          cells: st.cells.map((x) =>
            x.id === id
              ? {
                  ...x,
                  slug: x.slug || slugify(x.headline),
                  excerpt: x.excerpt || x.meta || "",
                  tags: x.tags && x.tags.length ? x.tags : [...x.keywords],
                  seoTitle: x.seoTitle || x.headline,
                  seoDesc: x.seoDesc || x.meta || "",
                  category: x.category || s?.wpCat || "",
                  featured: x.featured || "",
                  body: x.body || "",
                }
              : x,
          ),
          editing: id,
        }));
      },
      closeEditor: () => set({ editing: null }),


      addCell: () => {
        const id = `c${Date.now()}`;
        const { scope, boardKind } = get();
        const social = boardKind === "social";
        const c = makeCell({
          id,
          kind: boardKind,
          headline: social ? "Νέο social post" : "Νέα ιστορία",
          source: "Editorial",
          site: scope === "all" ? null : scope,
          status: social ? "idea" : "inbox",
          createdAt: Date.now(),
          event: "",
          ...(social ? { caption: "", hashtags: [], scheduledAt: null } : {}),
        });
        set((s) => ({ cells: [c, ...s.cells], open: id }));
        return id;
      },

      // Delete a single cell from the board (closes the drawer/editor if open).
      removeCell: (id) => {
        set((s) => ({
          cells: s.cells.filter((c) => c.id !== id),
          open: s.open === id ? null : s.open,
          editing: s.editing === id ? null : s.editing,
        }));
        get().flash("Η κάρτα διαγράφηκε");
      },

      // Manual stage move (drag / stage chips) — lead override. Named role actions
      // (submit/sendBack/approve) carry the real guards; the publish gate still
      // blocks a manual move into Published.
      move: (id, status) => {
        const cell = get().cells.find((x) => x.id === id);
        if (!cell || status === cell.status) return;
        // Article cells must be assigned before they can move FORWARD (social
        // cells have no assignee and move freely). Sending a card back to Inbox is
        // always allowed, so an unassigned/stuck cell can be recovered.
        if (
          (cell.kind ?? "article") !== "social" &&
          !cell.assignee &&
          status !== "inbox"
        ) {
          get().flash("Ανάθεσε πρώτα συντάκτη για αλλαγή σταδίου");
          return;
        }
        if (status === "published") {
          if (!canPublish(cell)) {
            get().flash("Δεν δημοσιεύεται: κρίσιμο SEO πρόβλημα");
            return;
          }
        }
        set((s) => ({
          cells: s.cells.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status,
                  slaDeadline: status === "published" ? null : c.slaDeadline,
                }
              : c,
          ),
        }));
      },

      updateCell: (id, patch) =>
        set((s) => ({
          cells: s.cells.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      reroute: async (id) => {
        const c = get().cells.find((x) => x.id === id);
        if (!c) return;
        set((s) => ({
          cells: s.cells.map((x) =>
            x.id === id ? { ...x, _routing: true } : x,
          ),
        }));
        const res = await rerouteStory(c);
        set((s) => ({
          cells: s.cells.map((x) =>
            x.id === id
              ? {
                  ...x,
                  site: res.site,
                  confidence: res.confidence,
                  routeReason: res.reason,
                  _routing: false,
                }
              : x,
          ),
        }));
        get().flash(
          res.site
            ? `Routed → ${siteById(res.site)?.name} (${res.confidence}%)`
            : "Routing: χρειάζεται χειροκίνητη ανάθεση",
        );
      },

      publishWP: async (id) => {
        const c = get().cells.find((x) => x.id === id);
        const s = siteById(c?.site ?? null);
        if (!c || !s) {
          get().flash("Ανάθεσε πρώτα ένα site");
          return;
        }
        if (c.wpPostId) return;
        // Publish gate — block on an unresolved critical SEO issue.
        if (!canPublish(c)) {
          const n = criticalBlockers(c).length;
          get().flash(`Δεν δημοσιεύεται: ${n} κρίσιμο SEO πρόβλημα`);
          return;
        }
        set((st) => ({
          cells: st.cells.map((x) =>
            x.id === id ? { ...x, _publishing: true } : x,
          ),
        }));
        const { postId } = await publishToWp(c);
        set((st) => ({
          cells: st.cells.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "published",
                  wpPostId: postId,
                  slaDeadline: null,
                  _publishing: false,
                }
              : x,
          ),
        }));
        get().flash(`Δημοσιεύτηκε στο ${s.wp} · post #${postId}`);
      },

      runSeoRetro: async () => {
        const r = await runSeoRetroSvc();
        if (!r) {
          get().flash("Χθεσινή αναφορά: μη διαθέσιμη (backend offline)");
          return;
        }
        const when = r.generatedAt || Date.now();
        // Map the n8n site key (e.g. "sportal.gr") → FE site id ("sportal").
        const gradeByFeId: Record<string, (typeof r.sites)[string]["grade"]> = {};
        const newReports = Object.entries(r.sites).map(([siteKey, d]) => {
          const feId = siteBySeoKey(siteKey)?.id ?? siteKey;
          gradeByFeId[feId] = d.grade;
          return {
            // stable id per site → re-running REPLACES the card (no duplicates)
            id: `seo-retro-${feId}`,
            type: "seo_retro" as const,
            site: feId,
            date: when,
            status: d.grade,
            body: d.lessons ?? [],
            volume: d.volume,
            issues: d.issues,
            offenders: d.offenders,
            lessons: d.lessons,
          };
        });
        const newIds = new Set(newReports.map((x) => x.id));
        set((s) => ({
          reports: [
            ...newReports,
            ...s.reports.filter((rep) => !newIds.has(rep.id)),
          ].slice(0, 60),
          // per-portal lights reflect yesterday's grade
          siteKpi: Object.fromEntries(
            Object.entries(s.siteKpi).map(([id, k]) => [
              id,
              gradeByFeId[id] ? { ...k, seo: gradeByFeId[id] } : k,
            ]),
          ),
          agents: stamp(s.agents, ["seo"]),
        }));
        get().flash("Χθεσινή αναφορά SEO έτοιμη");
      },

      runKPI: async () => {
        const k = await getKpiSvc();
        if (!k) {
          get().flash("KPI: μη διαθέσιμο (GA4 backend offline)");
          return;
        }
        const sites = Object.values(k.siteKpi);
        // Prefer the backend's clean network total (7d window) over re-summing rows.
        const net7d = k.network.byWindow?.["7d"]?.totals?.screenPageViews;
        const totalViews =
          net7d ?? sites.reduce((n, s) => n + (s.views || 0), 0);
        const totalArticles = sites.reduce((n, s) => n + (s.articles || 0), 0);
        const line = `Δίκτυο: ${(totalViews / 1000).toFixed(1)}K προβολές, ${totalArticles} άρθρα σε ${sites.length} portals.`;
        const kpiMeta = {
          generatedAt: k.generatedAt || Date.now(),
          lastUpdated: k.lastUpdated ?? k.generatedAt ?? Date.now(),
          windows: k.windows ?? ["today", "7d", "28d"],
          defaultWindow: k.defaultWindow ?? "7d",
          flags: k.flags ?? { sampled: false, thresholded: false },
          finalityByWindow: k.finalityByWindow ?? {},
        };
        set((s) => ({
          siteKpi: k.siteKpi,
          network: k.network,
          kpiMeta,
          reports: [
            {
              id: `kpi-${Date.now()}`,
              type: "kpi" as const,
              site: get().scope,
              date: Date.now(),
              status: "green" as const,
              body: [line],
              kpi: { siteKpi: k.siteKpi, network: k.network },
            },
            ...s.reports,
          ].slice(0, 40),
          agents: stamp(s.agents, ["kpi"]),
        }));
        get().flash("KPI: ενημερώθηκαν τα στοιχεία");
      },

      scanTrends: async () => {
        if (!get().agents.find((a) => a.id === "trend")?.on) {
          get().flash("Trend Radar: ανενεργό — ενεργοποίησέ το από τα Agents");
          return;
        }
        const trends = await scanTrendsSvc(get().scope);
        if (!trends) {
          get().flash("Trend Radar: μη διαθέσιμο (backend offline)");
          return;
        }
        set((s) => ({ trends, agents: stamp(s.agents, ["trend"]) }));
        get().flash("Trend Radar: scan ολοκληρώθηκε");
      },

      createCellFromTrend: (trend) => {
        const id = `c${Date.now()}`;
        // prefer the backend's suggested primary site, else keyword-route the topic
        const sug = trend.suggestedSites?.[0];
        const routed = sug
          ? { site: sug.site, confidence: Math.round(sug.confidence * 100) }
          : routeContent(trend.topic);
        const platform = trend.platform || (trend.platforms ?? []).join(" · ");
        const c = makeCell({
          id,
          headline: trend.topic,
          source: platform ? `Trend Radar · ${platform}` : "Trend Radar",
          site: routed.site,
          confidence: routed.site ? routed.confidence : null,
          status: "inbox", // Social Radar cells land in Inbox (already site-routed)
          createdAt: Date.now(),
          event: trend.angleGr || trend.note || "",
        });
        set((s) => ({
          cells: [c, ...s.cells],
          // the trend is now a Story Cell in progress → drop it from the radar
          // so it stops being suggested while it's being worked on.
          trends: s.trends.filter((t) => t.id !== trend.id),
          open: id,
          agents: stamp(s.agents, ["router"]),
        }));
        // persist the state so the next scan doesn't resurface it
        void setIdeaStateSvc(trend.id, "assigned");
        get().flash(
          routed.site
            ? `Cell από trend → ${siteById(routed.site)?.name}`
            : "Cell από trend — χρειάζεται ανάθεση",
        );
        return id;
      },

      // ── Trend Radar (Global/Greece) ──
      setTrendScope: (scope) => set({ trendScope: scope }),

      loadRadar: async (scope, scan = false) => {
        const trends = await getRadarTrendsSvc(scope, scan);
        if (!trends) {
          get().flash("Trend Radar: μη διαθέσιμο (Social Radar offline)");
          return;
        }
        set({ radarTrends: trends, trendScope: scope });
        if (scan) get().flash("Trend Radar: scan ολοκληρώθηκε");
      },

      openTrendIdea: (id) => set({ trendIdea: id }),
      closeTrendIdea: () => set({ trendIdea: null }),

      // Spawn a Story Cell from a radar trend (uses the top suggested brand, else
      // keyword-routes the title). Mirrors createCellFromTrend.
      createCellFromRadarTrend: (trend) => {
        const id = `c${Date.now()}`;
        const sug = trend.suggestedBrands?.[0];
        const routed =
          sug && siteById(sug.site)
            ? { site: sug.site, confidence: Math.round(sug.confidence * 100) }
            : routeContent(trend.title);
        const platform = (trend.platforms ?? []).join(" · ");
        const c = makeCell({
          id,
          headline: trend.title,
          source: platform ? `Trend Radar · ${platform}` : "Trend Radar",
          site: routed.site,
          confidence: routed.site ? routed.confidence : null,
          status: "inbox",
          createdAt: Date.now(),
          event: trend.title,
          trendTitle: trend.title, // marks the board cell as trend-originated
        });
        set((s) => ({
          cells: [c, ...s.cells],
          open: id,
          trendIdea: null,
          usedTrends: s.usedTrends.includes(trend.id)
            ? s.usedTrends
            : [...s.usedTrends, trend.id],
        }));
        get().flash(
          routed.site
            ? `Cell από trend → ${siteById(routed.site)?.name}`
            : "Cell από trend — χρειάζεται ανάθεση",
        );
        return id;
      },

      // ── Per-idea "Create cell" (Trend Radar modal) ──
      // A single social idea → a Social-board cell at the "idea" stage; switches
      // the newsroom to the Social board + opens the drawer (modal closes itself).
      createSocialCell: ({ platform, headline, caption, hashtags, site, trendTitle }) => {
        const id = `s${Date.now()}`;
        const c = makeCell({
          id,
          kind: "social",
          headline: headline || caption.slice(0, 60) || "Social post",
          source: trendTitle ? `Trend Radar · ${trendTitle}` : "Trend Radar",
          site,
          status: "idea",
          createdAt: Date.now(),
          platform,
          caption,
          hashtags: hashtags ?? [],
          scheduledAt: null,
          trendTitle,
        });
        set((s) => ({
          cells: [c, ...s.cells],
          boardKind: "social",
          open: id,
          trendIdea: null,
        }));
        get().flash(`Social cell δημιουργήθηκε · ${platform}`);
        return id;
      },

      // An article idea → a FULL Articles-board cell at "inbox" — populated like an
      // AMNA-feed cell (body draft + AI title options + meta + keywords/tags), so
      // it opens with the complete editorial toolkit (title select, editor, SEO).
      createArticleCellFromIdea: ({
        headline,
        body,
        titles,
        meta,
        keywords,
        excerpt,
        event,
        sourceText,
        site,
        trendTitle,
      }) => {
        const id = `c${Date.now()}`;
        // route to the brand's WP category (mirrors openEditor's normalization)
        const s0 = siteById(site ?? null);
        const kw = keywords && keywords.length ? keywords : [];
        // ensure the chosen headline is among the title options (so it's selected)
        const titleOpts = (titles && titles.length ? titles : [headline]).filter(
          Boolean,
        );
        if (!titleOpts.includes(headline)) titleOpts.unshift(headline);
        const c = makeCell({
          id,
          kind: "article",
          headline,
          source: trendTitle ? `Trend Radar · ${trendTitle}` : "Trend Radar",
          site,
          confidence: site ? 80 : null,
          status: "inbox",
          createdAt: Date.now(),
          event: event || trendTitle || headline,
          sourceText: sourceText || "",
          body,
          titles: titleOpts,
          meta: meta || "",
          keywords: kw,
          tags: kw,
          seoTitle: headline,
          seoDesc: meta || "",
          excerpt: excerpt || meta || "",
          category: s0?.wpCat || "",
          aiVersion: 1, // arrives WITH a draft, like an AMNA-feed cell
          trendTitle,
        });
        set((s) => ({
          cells: [c, ...s.cells],
          boardKind: "article",
          open: id,
          trendIdea: null,
          agents: stamp(s.agents, ["router"]),
        }));
        get().flash("Cell άρθρου δημιουργήθηκε (πλήρες)");
        return id;
      },

      // ── Social board transitions (no SEO gate; lighter than the article flow) ──
      composeSocial: (id) =>
        set((s) => ({
          cells: s.cells.map((c) =>
            c.id === id ? { ...c, status: "composing" } : c,
          ),
        })),

      submitSocialForApproval: (id) => {
        set((s) => ({
          cells: s.cells.map((c) =>
            c.id === id ? { ...c, status: "approval" } : c,
          ),
        }));
        get().flash("Υποβλήθηκε για έγκριση");
      },

      approveSocialSchedule: (id, whenMs) => {
        set((s) => ({
          cells: s.cells.map((c) =>
            c.id === id
              ? { ...c, status: "scheduled", scheduledAt: whenMs }
              : c,
          ),
        }));
        get().flash("Εγκρίθηκε & προγραμματίστηκε");
      },

      returnSocial: (id) => {
        set((s) => ({
          cells: s.cells.map((c) =>
            c.id === id ? { ...c, status: "composing" } : c,
          ),
        }));
        get().flash("Επιστράφηκε για σύνταξη");
      },

      postSocial: async (id) => {
        const c = get().cells.find((x) => x.id === id);
        if (!c) return;
        set((s) => ({
          cells: s.cells.map((x) =>
            x.id === id ? { ...x, _publishing: true } : x,
          ),
        }));
        const { postId } = await publishToSocial(c);
        set((s) => ({
          cells: s.cells.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "posted",
                  _publishing: false,
                  promo: { wpPostId: null, social: true, newsletter: false },
                }
              : x,
          ),
        }));
        get().flash(`Δημοσιεύτηκε στο ${c.platform ?? "social"} · ${postId}`);
      },

      findGaps: async (scope) => {
        if (!get().agents.find((a) => a.id === "gap")?.on) {
          get().flash("Content Gaps: ανενεργό — ενεργοποίησέ το από τα Agents");
          return;
        }
        const gaps = await findGapsSvc(scope);
        if (!gaps) {
          get().flash("Content Gap: μη διαθέσιμο (Social Radar offline)");
          return;
        }
        set((s) => ({ gaps, agents: stamp(s.agents, ["gap"]) }));
        get().flash("Content Gap: ευκαιρίες βρέθηκαν");
      },

      createCellFromGap: (gap) => {
        const id = `c${Date.now()}`;
        // prefer the engine's suggested primary site, else keyword-route the idea
        const sug = gap.suggestedSites?.[0];
        const routed =
          sug && sug.site !== "network/other"
            ? { site: sug.site, confidence: Math.round(sug.confidence * 100) }
            : routeContent(gap.idea);
        const platform = (gap.platforms ?? []).join(" · ");
        const c = makeCell({
          id,
          headline: gap.idea,
          source: platform ? `Social Radar · ${platform}` : "Social Radar",
          site: routed.site,
          confidence: routed.site ? routed.confidence : null,
          status: "inbox", // Social Radar cells land in Inbox (already site-routed)
          createdAt: Date.now(),
          event: gap.briefGr || gap.angleGr || gap.reason || "",
        });
        set((s) => ({
          cells: [c, ...s.cells],
          // now an in-progress Story Cell → remove it from the opportunities list
          gaps: s.gaps.filter((g) => g.id !== gap.id),
          open: id,
          agents: stamp(s.agents, ["router"]),
        }));
        // mark the idea assigned so it stops resurfacing
        void setIdeaStateSvc(gap.id, "assigned");
        get().flash(
          routed.site
            ? `Cell από ευκαιρία → ${siteById(routed.site)?.name}`
            : "Cell από ευκαιρία — χρειάζεται ανάθεση",
        );
        return id;
      },

      dismissGap: async (id) => {
        // optimistic remove + persist state so tomorrow's list stays clean
        set((s) => ({ gaps: s.gaps.filter((g) => g.id !== id) }));
        const ok = await setIdeaStateSvc(id, "dismissed" as IdeaState);
        get().flash(ok ? "Ευκαιρία απορρίφθηκε" : "Η απόρριψη δεν αποθηκεύτηκε");
      },

      // Pull ingested wire (ΑΠΕ-ΜΠΕ) cells from the backend into the board.
      // ALWAYS triggers a live crawl first, then reads the freshest rows — so the
      // manual button reflects the latest AMNA feed regardless of the background
      // schedule/cadence. Dedup on originalId so re-pulling never duplicates.
      // Returns how many new cells landed.
      pullInbox: async () => {
        get().flash("ΑΠΕ-ΜΠΕ: λήψη των τελευταίων…");
        // Crawl live (best-effort): even if the crawl is slow/aborts we still read
        // whatever landed. This is what makes the button always fetch the latest.
        await runAmnaIngestSvc();
        const incoming = await getInboxSvc();
        if (!incoming) {
          get().flash("ΑΠΕ-ΜΠΕ: μη διαθέσιμο (backend offline)");
          return 0;
        }
        const seen = new Set(
          get().cells.map((c) => c.originalId).filter(Boolean) as string[],
        );
        const fresh = incoming.filter(
          (c) => !c.originalId || !seen.has(c.originalId),
        );
        if (fresh.length === 0) {
          get().flash("ΑΠΕ-ΜΠΕ: καμία νέα είδηση");
          return 0;
        }
        const stampMs = Date.now();
        const cells = fresh.map((c, i) =>
          makeCell({
            ...c,
            id: c.originalId ? `amna-${c.originalId}` : `amna-${stampMs}-${i}`,
            source: c.source || "ΑΠΕ-ΜΠΕ",
            // Wire articles land in Inbox; the AMNA rewrite IS the draft (v1),
            // surfaced once a writer is assigned and opens the AI Draft stage.
            status: "inbox",
            aiVersion: 1,
            createdAt: c.createdAt ?? stampMs,
          }),
        );
        set((s) => ({
          cells: [...cells, ...s.cells],
          agents: stamp(s.agents, ["ingest", "router"]),
        }));
        get().flash(`ΑΠΕ-ΜΠΕ: ${fresh.length} νέες ειδήσεις στο board`);
        return fresh.length;
      },

      /* ── Board v2: two-person flow ── */

      setCurrentUser: (userId) => set({ currentUser: userId }),

      // Is the current user the cell's owner for this role? (leads override.)
      // inlined per-action below via these helpers.

      assign: (id, writerId) => {
        const c = get().cells.find((x) => x.id === id);
        if (!c) return;
        const writer = writerId ? userById(writerId) : nextWriter(c.site);
        if (!writer) {
          get().flash("Δεν υπάρχει διαθέσιμος συντάκτης για αυτό το site");
          return;
        }
        const auto = !!siteById(c.site)?.autoDraft;
        set((s) => ({
          cells: s.cells.map((x) =>
            x.id === id
              ? {
                  ...x,
                  assignee: writer.id,
                  assignedAt: Date.now(),
                  status: auto ? "ai_draft" : "assigned",
                  aiVersion: auto ? Math.max(1, x.aiVersion) : x.aiVersion,
                }
              : x,
          ),
        }));
        get().flash(
          auto
            ? `Ανατέθηκε → ${writer.name} · draft έτοιμο`
            : `Ανατέθηκε → ${writer.name}`,
        );
      },

      // No AI backend — the AMNA rewrite IS the draft. This opens the AI Draft
      // stage for the assignee to edit. (assignee or lead)
      generateDraft: async (id) => {
        const c = get().cells.find((x) => x.id === id);
        if (!c) return;
        const me = get().currentUser;
        if (me !== c.assignee && userById(me)?.role !== "lead") {
          get().flash("Μόνο ο ανατεθειμένος συντάκτης ανοίγει το draft");
          return;
        }
        // spinner while Claude (via n8n) writes the draft
        set((s) => ({
          cells: s.cells.map((x) =>
            x.id === id ? { ...x, _drafting: true } : x,
          ),
        }));
        const draft = await generateDraftSvc(c);
        set((s) => ({
          cells: s.cells.map((x) =>
            x.id === id
              ? {
                  ...x,
                  // apply the AI output when available; advance regardless so the
                  // writer can always open the editor and continue manually.
                  ...(draft
                    ? {
                        headline: draft.headline?.trim() || x.headline,
                        titles: draft.titles.length ? draft.titles : x.titles,
                        meta: draft.meta || x.meta,
                        seoTitle: draft.seoTitle || x.seoTitle,
                        excerpt: draft.excerpt || x.excerpt,
                        keywords: draft.keywords.length
                          ? draft.keywords
                          : x.keywords,
                        tags: draft.keywords.length ? draft.keywords : x.tags,
                        body: draft.body || x.body,
                      }
                    : {}),
                  status: "ai_draft",
                  aiVersion: Math.max(1, x.aiVersion + (draft ? 1 : 0)),
                  _drafting: false,
                }
              : x,
          ),
        }));
        get().flash(
          draft ? "AI draft έτοιμο" : "AI draft: μη διαθέσιμο (backend offline)",
        );
      },

      submitForReview: (id, editorId) => {
        const c = get().cells.find((x) => x.id === id);
        if (!c) return;
        const me = get().currentUser;
        if (me !== c.assignee && userById(me)?.role !== "lead") {
          get().flash("Μόνο ο συντάκτης υποβάλλει για review");
          return;
        }
        const reviewer = editorId
          ? userById(editorId)
          : pickReviewer(c.site, c.assignee);
        if (!reviewer || reviewer.id === c.assignee) {
          get().flash("Χρειάζεται επιμελητής διαφορετικός από τον συντάκτη");
          return;
        }
        set((s) => ({
          cells: s.cells.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "review",
                  reviewer: reviewer.id,
                  submittedAt: Date.now(),
                  returnedFromReview: false,
                }
              : x,
          ),
        }));
        get().flash(`Στάλθηκε για review → ${reviewer.name}`);
      },

      // Editor sends back to the SAME assignee with a required note.
      sendBack: (id, note) => {
        const c = get().cells.find((x) => x.id === id);
        if (!c) return;
        const me = get().currentUser;
        if (me !== c.reviewer && userById(me)?.role !== "lead") {
          get().flash("Μόνο ο επιμελητής επιστρέφει το άρθρο");
          return;
        }
        if (!note.trim()) {
          get().flash("Χρειάζεται σχόλιο για την επιστροφή");
          return;
        }
        set((s) => ({
          cells: s.cells.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "ai_draft", // back to the same assignee, NOT a fresh draft
                  returnedFromReview: true,
                  editorNotes: [
                    { by: me, text: note.trim(), at: Date.now() },
                    ...x.editorNotes,
                  ],
                }
              : x,
          ),
        }));
        get().flash("Επιστράφηκε στον συντάκτη με σχόλια");
      },

      approveAndPublish: async (id) => {
        const c = get().cells.find((x) => x.id === id);
        if (!c) return;
        const me = get().currentUser;
        if (me !== c.reviewer && userById(me)?.role !== "lead") {
          get().flash("Μόνο ο επιμελητής εγκρίνει & δημοσιεύει");
          return;
        }
        if (!canPublish(c)) {
          get().flash(
            `Δεν δημοσιεύεται: ${criticalBlockers(c).length} κρίσιμο SEO πρόβλημα`,
          );
          return;
        }
        await get().publishWP(id); // publishes + sets status/wpPostId (re-checks gate)
        const done = get().cells.find((x) => x.id === id);
        if (done?.status === "published") {
          // auto promo on publish (FE stub; real social/newsletter push later)
          set((s) => ({
            cells: s.cells.map((x) =>
              x.id === id
                ? {
                    ...x,
                    promo: {
                      wpPostId: x.wpPostId,
                      social: true,
                      newsletter: true,
                    },
                  }
                : x,
            ),
          }));
          get().flash("Δημοσιεύτηκε + αυτόματο social/newsletter promo ✓");
        }
      },

      reassign: (id, writerId) => {
        const w = userById(writerId);
        if (!w) return;
        set((s) => ({
          cells: s.cells.map((x) =>
            x.id === id ? { ...x, assignee: w.id, assignedAt: Date.now() } : x,
          ),
        }));
        get().flash(`Ανατέθηκε εκ νέου → ${w.name}`);
      },

      toggleAgent: (id) =>
        set((s) => ({
          agents: s.agents.map((a) =>
            a.id === id ? { ...a, on: !a.on } : a,
          ),
        })),

      morning: async () => {
        get().flash("Ενημέρωση δικτύου…");
        await get().runSeoRetro();
        await get().runKPI();
        await get().scanTrends();
        await get().findGaps(get().scope);
        await get().pullInbox();
        get().flash("Ενημέρωση δικτύου ολοκληρώθηκε");
      },
    }),
    {
      // v4: all mock data removed — discard any persisted mock state (v2/v3) so the
      // board/dashboard start empty and fill only from real backends.
      name: "newsroom-v4",
      storage,
      skipHydration: true,
      // Persist only domain state (+ scope); drop transient flags and UI state.
      partialize: (s) =>
        ({
          scope: s.scope,
          currentUser: s.currentUser,
          cells: s.cells.map((c) => {
            const copy = { ...c };
            delete copy._routing;
            delete copy._drafting;
            delete copy._publishing;
            return copy;
          }),
          trends: s.trends,
          gaps: s.gaps,
          reports: s.reports,
          agents: s.agents,
          siteKpi: s.siteKpi,
          seo: s.seo,
          network: s.network,
          kpiMeta: s.kpiMeta,
          usedTrends: s.usedTrends,
        }) as NewsroomState,
    },
  ),
);
