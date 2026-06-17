import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Agent,
  Cell,
  ColumnId,
  Gap,
  IdeaState,
  NewsroomState,
  Scope,
  Trend,
} from "@/lib/types";
import { SEED, makeCell } from "@/lib/data/seed";
import { siteById, siteBySeoKey } from "@/lib/config/sites";
import { userById, nextWriter, pickReviewer } from "@/lib/config/team";
import { slugify } from "@/lib/utils/slug";
import { routeContent } from "@/lib/services/router";
import { publishToWp } from "@/lib/services/wordpress";
import { canPublish, criticalBlockers } from "@/lib/services/seoGate";
import {
  rerouteStory,
  runSeoRetro as runSeoRetroSvc,
  scanTrends as scanTrendsSvc,
  findGaps as findGapsSvc,
  setIdeaState as setIdeaStateSvc,
  getInbox as getInboxSvc,
  getKpi as getKpiSvc,
} from "@/lib/services/agents";

interface UiState {
  open: string | null; // cell id shown in the drawer
  editing: string | null; // cell id shown in the full-screen article editor
  toast: string | null;
}

interface Actions {
  setScope: (scope: Scope) => void;
  addCell: () => string;
  move: (id: string, status: ColumnId) => void;
  updateCell: (id: string, patch: Partial<Cell>) => void;
  reroute: (id: string) => Promise<void>;
  publishWP: (id: string) => Promise<void>;
  runSeoRetro: () => Promise<void>;
  runKPI: () => Promise<void>;
  scanTrends: () => Promise<void>;
  createCellFromTrend: (trend: Trend) => string;
  findGaps: (scope: Scope) => Promise<void>;
  createCellFromGap: (gap: Gap) => string;
  dismissGap: (id: string) => Promise<void>;
  pullInbox: () => Promise<number>;
  // Board v2 — two-person flow (role-guarded by currentUser)
  setCurrentUser: (userId: string) => void;
  assign: (id: string, writerId?: string) => void;
  generateDraft: (id: string) => void;
  submitForReview: (id: string, editorId?: string) => void;
  sendBack: (id: string, note: string) => void;
  approveAndPublish: (id: string) => Promise<void>;
  reassign: (id: string, writerId: string) => void;
  toggleAgent: (id: string) => void;
  morning: () => Promise<void>;
  openCell: (id: string) => void;
  closeCell: () => void;
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

      setScope: (scope) => set({ scope }),

      flash: (msg) => {
        set({ toast: msg });
        if (flashTimer) clearTimeout(flashTimer);
        flashTimer = setTimeout(() => set({ toast: null }), 2600);
      },

      openCell: (id) => set({ open: id }),
      closeCell: () => set({ open: null }),
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
        const { scope } = get();
        const c = makeCell({
          id,
          headline: "Νέα ιστορία",
          source: "Editorial",
          site: scope === "all" ? null : scope,
          status: "inbox",
          createdAt: Date.now(),
          event: "",
        });
        set((s) => ({ cells: [c, ...s.cells], open: id }));
        return id;
      },

      // Manual stage move (drag / stage chips) — lead override. Named role actions
      // (submit/sendBack/approve) carry the real guards; the publish gate still
      // blocks a manual move into Published.
      move: (id, status) => {
        if (status === "published") {
          const c = get().cells.find((x) => x.id === id);
          if (c && !canPublish(c)) {
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
        const totalViews = sites.reduce((n, s) => n + (s.views || 0), 0);
        const totalArticles = sites.reduce((n, s) => n + (s.articles || 0), 0);
        const line = `Δίκτυο: ${(totalViews / 1000).toFixed(1)}K προβολές, ${totalArticles} άρθρα σε ${sites.length} portals.`;
        set((s) => ({
          siteKpi: k.siteKpi,
          network: k.network,
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

      // Pull ingested wire (ΑΠΕ-ΜΠΕ) cells from the backend into the board. Each
      // payload is already routed + rewritten; we dedup on originalId so re-pulling
      // never duplicates, then prepend the new ones (status from the payload, e.g.
      // ai_draft). Returns how many new cells landed.
      pullInbox: async () => {
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
      generateDraft: (id) => {
        const c = get().cells.find((x) => x.id === id);
        if (!c) return;
        const me = get().currentUser;
        if (me !== c.assignee && userById(me)?.role !== "lead") {
          get().flash("Μόνο ο ανατεθειμένος συντάκτης ανοίγει το draft");
          return;
        }
        set((s) => ({
          cells: s.cells.map((x) =>
            x.id === id
              ? { ...x, status: "ai_draft", aiVersion: Math.max(1, x.aiVersion) }
              : x,
          ),
        }));
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
        }) as NewsroomState,
    },
  ),
);
