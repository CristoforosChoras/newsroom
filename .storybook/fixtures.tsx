import type { Decorator } from "@storybook/nextjs-vite";
import type {
  Cell,
  Gap,
  NetworkState,
  Report,
  SiteKpi,
  Trend,
} from "@/lib/types";
import { makeCell, SEED } from "@/lib/data/seed";
import { useNewsroom } from "@/lib/store/useNewsroom";

// ─────────────────────────────────────────────────────────────────────────────
// Sample data for Storybook ONLY. The real app's SEED is intentionally empty
// (everything fills from live backends), so store-coupled views render blank
// without seeding. These fixtures give the views realistic content to render.
// ─────────────────────────────────────────────────────────────────────────────

const t = (minsAgo: number) => Date.now() - minsAgo * 60_000;

export const sampleCells: Cell[] = [
  makeCell({
    id: "c_inbox",
    headline: "ΣΥΡΙΖΑ: Τα δεδομένα Eurostat καταρρίπτουν το κυβερνητικό αφήγημα",
    source: "ΑΠΕ-ΜΠΕ",
    site: "popaganda",
    confidence: 100,
    routeReason: "AMNA section «home» → Popaganda",
    urgency: "breaking",
    status: "inbox",
    createdAt: t(8),
    slaDeadline: t(-25),
    event: "Πολιτική αντιπαράθεση για τα οικονομικά στοιχεία",
    originalUrl: "https://www.amna.gr/home/article/1002055/",
    originalId: "1002055",
    sourceText: "Το πρωτότυπο τηλεγράφημα του ΑΠΕ-ΜΠΕ (αναφορά μόνο).",
  }),
  makeCell({
    id: "c_assigned",
    headline: "Καλάθης: «Στον ΠΑΟΚ χτίζεται κάτι ξεχωριστό»",
    source: "ΑΠΕ-ΜΠΕ",
    site: "sportal",
    confidence: 100,
    status: "assigned",
    createdAt: t(20),
    assignee: "w_sportal_1",
    assignedAt: t(15),
    event: "Δηλώσεις παίκτη μετά τη μεταγραφή",
  }),
  makeCell({
    id: "c_draft",
    headline: "Νέος οδηγός ευεξίας: 5 συνήθειες για καλύτερο ύπνο",
    source: "Editorial",
    site: "muse",
    status: "ai_draft",
    createdAt: t(40),
    assignee: "w_life_1",
    assignedAt: t(38),
    aiVersion: 1,
    titles: ["5 συνήθειες για καλύτερο ύπνο", "Ο οδηγός ύπνου που χρειάζεσαι"],
    meta: "Πέντε επιστημονικά τεκμηριωμένες συνήθειες για ποιοτικό ύπνο και ξεκούραστα πρωινά.",
    keywords: ["ύπνος", "ευεξία", "υγεία"],
    body: "<p>Ο ποιοτικός ύπνος ξεκινά από τη ρουτίνα…</p>",
  }),
  makeCell({
    id: "c_review",
    headline: "Μουντιάλ 2026: 99% πληρότητα στην πρώτη αγωνιστική",
    source: "ΑΠΕ-ΜΠΕ",
    site: "sportal",
    status: "review",
    createdAt: t(60),
    assignee: "w_sportal_2",
    reviewer: "e_sports",
    assignedAt: t(58),
    submittedAt: t(10),
    aiVersion: 1,
    meta: "Εντυπωσιακά νούμερα προσέλευσης στην πρεμιέρα του Παγκοσμίου Κυπέλλου 2026.",
    seoTitle: "Μουντιάλ 2026: ρεκόρ πληρότητας στην πρεμιέρα",
    featured: "https://www.amna.gr/photos/sample-stadium.jpg",
    body: "<p>Η πρώτη αγωνιστική των ομίλων…</p>",
  }),
  makeCell({
    id: "c_returned",
    headline: "Φάμελλος: Η κυβέρνηση να μην αλλοιώσει την απόφαση",
    source: "ΑΠΕ-ΜΠΕ",
    site: "popaganda",
    status: "ai_draft",
    createdAt: t(75),
    assignee: "w_life_2",
    assignedAt: t(73),
    aiVersion: 2,
    returnedFromReview: true,
    editorNotes: [
      { by: "e_general", text: "Χρειάζεται δεύτερη πηγή στην 2η παράγραφο.", at: t(12) },
    ],
    body: "<p>Δήλωση για το θεσμικό πλαίσιο…</p>",
  }),
  makeCell({
    id: "c_published",
    headline: "Συναυλία-αφιέρωμα στον Syd Barrett",
    source: "Editorial",
    site: "klik",
    status: "published",
    createdAt: t(180),
    assignee: "w_life_1",
    reviewer: "e_life",
    aiVersion: 1,
    wpPostId: 48211,
    featured: "https://www.amna.gr/photos/sample-concert.jpg",
    meta: "Μια βραδιά τιμής στον θρυλικό μουσικό, με ειδικούς καλεσμένους.",
    promo: { wpPostId: 48211, social: true, newsletter: true },
  }),
];

export const sampleTrends: Trend[] = [
  {
    id: "tr1",
    topic: "Μουντιάλ 2026",
    site: "sportal",
    velocity: 92,
    platform: "google · youtube",
    note: "Αιχμή ενδιαφέροντος μετά την πρεμιέρα",
    lifecycle: "surging",
    platforms: ["google", "youtube"],
    coverage: { status: "partial", freshestUrl: null },
    angleGr: "Τα ρεκόρ προσέλευσης και τι σημαίνουν για τα δικαιώματα",
    sparkline: [10, 22, 35, 50, 71, 92],
  },
  {
    id: "tr2",
    topic: "Εκλογικός νόμος",
    site: "popaganda",
    velocity: 64,
    platform: "google · x",
    note: "Άνοδος μετά τις δηλώσεις της αντιπολίτευσης",
    lifecycle: "emerging",
    platforms: ["google", "x"],
    coverage: { status: "gap", freshestUrl: null },
    angleGr: "Τι αλλάζει πρακτικά για τον ψηφοφόρο",
    sparkline: [5, 9, 18, 30, 48, 64],
  },
  {
    id: "tr3",
    topic: "Καλοκαιρινά φεστιβάλ",
    site: "muse",
    velocity: 41,
    platform: "tiktok",
    note: "Σταθερή ζήτηση για line-ups",
    lifecycle: "peaking",
    platforms: ["tiktok", "google"],
    coverage: { status: "covered", freshestUrl: "https://muse.gr/festivals" },
    angleGr: "Ο πλήρης οδηγός εξόδων του Ιουλίου",
    sparkline: [30, 35, 40, 42, 41, 41],
  },
];

export const sampleGaps: Gap[] = [
  {
    id: "g1",
    idea: "Οδηγός: πώς λειτουργεί το νέο εκλογικό σύστημα",
    type: "article",
    site: "popaganda",
    demand: 78,
    reason: "Υψηλή ζήτηση αναζήτησης, αδύναμη ελληνική κάλυψη",
    ideaType: "gap",
    demandSignal: "+78 search interest, 0 φρέσκα ελληνικά άρθρα",
    winnability: 0.7,
    angleGr: "Explainer με παραδείγματα",
    coverage: { status: "gap", freshestUrl: null },
  },
  {
    id: "g2",
    idea: "Συγκριτικό: ηλεκτρικά SUV κάτω από 35.000€",
    type: "article",
    site: "onlyauto",
    demand: 61,
    reason: "Σταθερή ζήτηση, μέτρια κάλυψη",
    ideaType: "both",
    winnability: 0.55,
    coverage: { status: "partial", freshestUrl: null },
  },
  {
    id: "g3",
    idea: "Video: 60'' highlights πρεμιέρας Μουντιάλ",
    type: "video",
    site: "sportal",
    demand: 54,
    reason: "Ζήτηση short-form, ανταγωνιστική κάλυψη",
    ideaType: "trend",
    winnability: 0.4,
    coverage: { status: "covered", freshestUrl: null },
  },
];

export const sampleSiteKpi: Record<string, SiteKpi> = {
  sportal: { views: 48210, views7d: 312044, delta: 6.4, articles: 23, seo: "green", wp: true },
  popaganda: { views: 12880, views7d: 71203, delta: -2.1, articles: 11, seo: "amber", wp: true },
  muse: { views: 8940, views7d: 60110, delta: 1.2, articles: 7, seo: "green", wp: true },
  klik: { views: 15320, views7d: 99800, delta: 9.8, articles: 9, seo: "red", wp: true },
};

export const sampleNetwork: NetworkState = {
  week: [
    { d: "Δευ", v: 210 },
    { d: "Τρι", v: 245 },
    { d: "Τετ", v: 198 },
    { d: "Πεμ", v: 276 },
    { d: "Παρ", v: 301 },
    { d: "Σαβ", v: 289 },
    { d: "Κυρ", v: 264 },
  ],
  sources: [
    { s: "Organic", p: 52 },
    { s: "Social", p: 28 },
    { s: "Direct", p: 14 },
    { s: "Referral", p: 6 },
  ],
  topArticles: [
    { t: "Μουντιάλ 2026: 99% πληρότητα", v: 18400, site: "sportal" },
    { t: "ΣΥΡΙΖΑ vs κυβέρνηση: τα νούμερα", v: 9200, site: "popaganda" },
    { t: "Συναυλία-αφιέρωμα στον Syd Barrett", v: 6100, site: "klik" },
  ],
  delta: 4.3,
  today: 264000,
};

export const sampleReports: Report[] = [
  {
    id: "r_retro",
    type: "seo_retro",
    site: "sportal",
    date: t(120),
    status: "red",
    body: ["Χθεσινός έλεγχος: 165/165 άρθρα ελέγχθηκαν."],
    volume: { published: 165, audited: 165, skippedPartner: 0 },
    issues: [
      { id: "noindex", class: "critical", label: "noindex σε ζωντανά άρθρα", count: 2, of: 165 },
      { id: "canonical", class: "critical", label: "Λείπει canonical", count: 2, of: 165 },
      { id: "schema", class: "improve", label: "Ελλιπές schema NewsArticle", count: 165, of: 165 },
    ],
    offenders: [
      { url: "https://sportal.gr/a/123", issues: ["noindex", "canonical"] },
    ],
    lessons: ["Έλεγξε το noindex πριν τη δημοσίευση", "Πρόσθεσε canonical στο template"],
  },
  {
    id: "r_kpi",
    type: "kpi",
    site: "all",
    date: t(200),
    status: "green",
    body: ["KPI snapshot δικτύου (7 ημέρες)."],
    kpi: { siteKpi: sampleSiteKpi, network: sampleNetwork },
  },
];

// Full store snapshot used as the per-story reset baseline.
function baseState() {
  return {
    ...SEED,
    currentUser: "lead",
    cells: sampleCells,
    trends: sampleTrends,
    gaps: sampleGaps,
    reports: sampleReports,
    siteKpi: sampleSiteKpi,
    network: sampleNetwork,
    // store-only transient fields (reset every story to avoid leakage)
    open: null,
    editing: null,
    toast: null,
  };
}

/**
 * Decorator that seeds the zustand store before a story renders and resets it
 * per story (the store is a module singleton). Pass overrides to tailor a story,
 * e.g. `withStore({ open: "c_review" })` to open the drawer on a cell.
 */
export const withStore =
  (overrides: Record<string, unknown> = {}): Decorator =>
  // eslint-disable-next-line react/display-name -- Storybook decorator, not a component
  (Story) => {
    useNewsroom.setState({ ...baseState(), ...overrides });
    return <Story />;
  };
