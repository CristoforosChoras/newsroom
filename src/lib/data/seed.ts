import type { Cell, NewsroomState } from "@/lib/types";

// Initial state for the 6-portal OnlyGroup network. NO mock content — every
// data surface starts empty and fills ONLY from real backends (AMNA ingestion,
// Social Radar trends/gaps, the SEO retrospective). `now` is evaluated once per
// module load; only SLA clocks read it, gated behind a mounted check.
const now = Date.now();

// Factory: applies sane defaults to a partial cell. Reused by the store for
// new / ingested cells.
const cell = (o: Partial<Cell> & Pick<Cell, "id" | "headline">): Cell => ({
  source: "Editorial",
  site: null,
  confidence: null,
  routeReason: "",
  urgency: "standard",
  status: "inbox",
  kind: "article",
  createdAt: now,
  slaDeadline: null,
  event: "",
  titles: [],
  keywords: [],
  meta: "",
  editor: "—",
  wpPostId: null,
  body: "",
  slug: "",
  excerpt: "",
  featured: "",
  tags: [],
  seoTitle: "",
  seoDesc: "",
  category: "",
  // Board v2 ownership defaults
  assignee: null,
  reviewer: null,
  assignedAt: null,
  submittedAt: null,
  aiVersion: 0,
  editorNotes: [],
  returnedFromReview: false,
  promo: null,
  ...o,
});

export const SEED: NewsroomState = {
  scope: "all",
  currentUser: "lead",
  // Board + agent outputs start EMPTY — populated by real backends only.
  cells: [],
  reports: [],
  trends: [],
  gaps: [],
  // KPI / dashboard metrics have no backend yet (GA4 not connected) → empty.
  network: {
    week: [],
    sources: [],
    topArticles: [],
  },
  siteKpi: {},
  kpiMeta: null,
  // SEO Health fills only from a real generated report (Reports → Χθεσινή).
  seo: {
    status: "green",
    checkedAt: null,
    items: [],
    actions: [],
  },
  agents: [
    {
      id: "router",
      name: "Auto-Router",
      on: true,
      schedule: "Συνεχόμενα",
      last: null,
      desc: "Κατατάσσει κάθε είδηση και την αναθέτει στο σωστό WordPress site βάσει vertical + περιεχομένου.",
    },
    {
      id: "ingest",
      name: "Ingestion ΑΠΕ-ΜΠΕ",
      on: true,
      schedule: "Κάθε ~7′",
      last: null,
      desc: "Λήψη ειδήσεων ΑΠΕ-ΜΠΕ → καθαρισμός κειμένου → routing + SEO rewrite → Story Cells (πάντα σε review).",
    },
    {
      id: "seo",
      name: "SEO Retro (Χθεσινή)",
      on: true,
      schedule: "07:00 καθημερινά",
      last: null,
      desc: "Ρετροσπεκτίβα: ελέγχει τα χθεσινά δημοσιευμένα άρθρα ανά portal (meta, canonical, schema, εικόνα) και βγάζει μαθήματα για σήμερα.",
    },
    {
      id: "kpi",
      name: "KPI Agent",
      on: true,
      schedule: "09:00 + on-demand",
      last: null,
      desc: "GA4 pageviews + WP REST άρθρα ανά portal, top άρθρα, 7-ήμερο trend, breaking SLA — ζωντανές μετρήσεις.",
    },
    {
      id: "trend",
      name: "Trend Radar",
      on: true,
      schedule: "08:00 + on-demand",
      last: null,
      desc: "Social Radar: ανερχόμενα θέματα ανά portal από Google/YouTube/X/TikTok, με προτεινόμενο site & ελληνική γωνία.",
    },
    {
      id: "gap",
      name: "Content Gaps",
      on: true,
      schedule: "08:00 + on-demand",
      last: null,
      desc: "Social Radar: τι έχει ζήτηση αλλά αδύναμη/καμία κάλυψη ανά portal — ranked ευκαιρίες.",
    },
  ],
};

// Factory reused by the store for new/ingested cells.
export const makeCell = cell;
