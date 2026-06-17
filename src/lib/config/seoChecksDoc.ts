// In-app reference of what the SEO agent checks (mirrors docs/SEO-AGENT.md §3).
// Display-only — the real measurement lives in the n8n audit engine.

export type CheckSeverity = "critical" | "warning" | "info" | "site";

export interface CheckItem {
  label: string; // Greek
  sev: CheckSeverity;
}
export interface CheckGroup {
  title: string; // Greek
  items: CheckItem[];
}

export const SEVERITY_LABEL: Record<CheckSeverity, string> = {
  critical: "Κρίσιμο",
  warning: "Σημαντικό",
  info: "Μικρό",
  site: "Site",
};

export const SEVERITY_COLOR: Record<CheckSeverity, string> = {
  critical: "var(--red)",
  warning: "var(--amber)",
  info: "var(--blue)",
  site: "#A855F7",
};

export const SEO_CHECKS_DOC: CheckGroup[] = [
  {
    title: "Crawl & διαθεσιμότητα",
    items: [
      { label: "Σφάλμα HTTP (non-200 / αποτυχία δικτύου)", sev: "critical" },
      { label: "Αλυσίδα redirects / loop", sev: "critical" },
      { label: "Αποκλεισμός crawler (Cloudflare/403/503)", sev: "critical" },
      { label: "Μη-HTML απάντηση", sev: "critical" },
      { label: "Canonical: λείπει / λάθος / http / πολλαπλά", sev: "critical" },
      { label: "noindex / περιορισμός crawl", sev: "critical" },
      { label: "Mixed content (http σε https)", sev: "warning" },
    ],
  },
  {
    title: "Indexing & sitemaps",
    items: [
      { label: "robots.txt (λάθος Disallow / λείπει Sitemap)", sev: "site" },
      { label: "Sitemap σφάλμα / άκυρο XML", sev: "site" },
      { label: "HTTPS canonicalization (http/https, www/apex)", sev: "site" },
      { label: "News sitemap παλιό (>48h)", sev: "site" },
      { label: "lastmod / publication_date άκυρο", sev: "site" },
      { label: "AI crawlers posture (GPTBot/ClaudeBot/…)", sev: "info" },
    ],
  },
  {
    title: "On-page & metadata",
    items: [
      { label: "Μήκος τίτλου (ιδανικό 30–60)", sev: "warning" },
      { label: "Meta description: λείπει / μήκος (70–160)", sev: "warning" },
      { label: "H1: λείπει / πολλαπλά", sev: "warning" },
      { label: "Λίγο περιεχόμενο (thin content)", sev: "warning" },
      { label: "Λίγα εσωτερικά links (<2)", sev: "warning" },
      { label: "Διπλότυπος τίτλος / meta (7 ημέρες)", sev: "warning" },
      { label: "Εικόνες χωρίς alt", sev: "info" },
      { label: "Μη καθαρό URL / links με tracking", sev: "info" },
    ],
  },
  {
    title: "Structured data & social",
    items: [
      { label: "Λείπει schema Άρθρου (NewsArticle/Article)", sev: "critical" },
      { label: "datePublished: λείπει / χωρίς ζώνη ώρας", sev: "critical" },
      { label: "Λείπουν πεδία schema (author/publisher/image)", sev: "warning" },
      { label: "Αδύναμος author / headline >110 / dateModified", sev: "warning" },
      { label: "og:image: λείπει / <1200px / χαλασμένο", sev: "warning" },
      { label: "max-image-preview:large, OG/Twitter, breadcrumb", sev: "info" },
    ],
  },
  {
    title: "Core Web Vitals & WordPress",
    items: [
      { label: "CWV (PSI): LCP/INP/CLS — προαιρετικό, off by default", sev: "info" },
      { label: "WordPress /wp-json/ προσβάσιμο (Muse: εκτός)", sev: "critical" },
    ],
  },
];
