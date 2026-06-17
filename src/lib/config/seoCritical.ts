import type { Cell, GateSeverity } from "@/lib/types";

/**
 * THE shared critical-set — the single contract between the publish gate (enforces)
 * and the retrospective audit (teaches). This file holds the checks that are
 * determinable from a DRAFT cell's editor fields (no live URL). The n8n retro
 * audit covers the live-URL-only checks (schema/canonical/news-sitemap/etc.).
 *
 * severity: 'critical' → blocks publishing. 'improve' → never blocks (advisory).
 * To promote/demote a check, just change its `severity` here.
 */
export interface GateCheck {
  id: string;
  label: string; // Greek, shown to the editor
  severity: GateSeverity;
  test: (c: Cell) => boolean; // true = PASS
}

function metaText(c: Cell): string {
  return (c.seoDesc || c.meta || "").trim();
}

function bodyWordCount(c: Cell): number {
  const text = (c.body || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[^;]+;/g, " ")
    .trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

export const GATE_CHECKS: GateCheck[] = [
  // ── critical (block publishing) ──
  {
    id: "headline",
    label: "Λείπει ο τίτλος",
    severity: "critical",
    test: (c) => !!c.headline.trim(),
  },
  {
    id: "headline_match",
    label: "Ο SEO τίτλος δεν ταιριάζει με τον τίτλο του άρθρου",
    severity: "critical",
    test: (c) => !c.seoTitle?.trim() || c.seoTitle.trim() === c.headline.trim(),
  },
  {
    id: "featured_image",
    label: "Λείπει η κεντρική εικόνα",
    severity: "critical",
    test: (c) => !!c.featured?.trim(),
  },
  {
    id: "meta_present",
    label: "Λείπει το meta description",
    severity: "critical",
    test: (c) => metaText(c).length > 0,
  },
  // ── improve (advisory, never blocks) ──
  {
    id: "meta_len",
    label: "Το meta description είναι εκτός 120–160 χαρακτήρων",
    severity: "improve",
    test: (c) => {
      const m = metaText(c);
      return m.length === 0 || (m.length >= 120 && m.length <= 160);
    },
  },
  {
    id: "seo_title_len",
    label: "Ο SEO τίτλος ξεπερνά τους 60 χαρακτήρες",
    severity: "improve",
    test: (c) => !c.seoTitle || c.seoTitle.length <= 60,
  },
  {
    id: "excerpt",
    label: "Λείπει η περίληψη",
    severity: "improve",
    test: (c) => !!c.excerpt?.trim(),
  },
  {
    id: "body_len",
    label: "Λίγο περιεχόμενο (κάτω από 150 λέξεις)",
    severity: "improve",
    test: (c) => bodyWordCount(c) >= 150,
  },
  {
    id: "tags",
    label: "Χωρίς ετικέτες",
    severity: "improve",
    test: (c) => (c.tags?.length ?? 0) > 0,
  },
];
