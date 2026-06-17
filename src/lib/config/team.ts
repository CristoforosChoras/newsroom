import type { Role, User } from "@/lib/types";

// Mock team (FE iteration — no real auth yet). The current-user switcher in the
// top bar lets you view the board as any of these to test role-gated actions.
// Real SSO replaces the switcher next iteration; the role checks stay.
// `sites: ["*"]` = works across the whole network.
export const USERS: User[] = [
  // Leads (can assign / reassign across the network)
  { id: "lead", name: "Αρχισυντάκτης", role: "lead", sites: ["*"] },

  // Writers (assignees)
  { id: "w_sportal_1", name: "Κ. Δήμου", role: "writer", sites: ["sportal", "outsidersbet"] },
  { id: "w_sportal_2", name: "Γ. Νίκου", role: "writer", sites: ["sportal", "outsidersbet"] },
  { id: "w_auto", name: "Μ. Παππά", role: "writer", sites: ["onlyauto"] },
  { id: "w_life_1", name: "Σ. Λέκκα", role: "writer", sites: ["muse", "klik"] },
  { id: "w_life_2", name: "Α. Ρόδη", role: "writer", sites: ["exodos", "klik", "muse"] },

  // Editors (reviewers) — kept distinct from writers
  { id: "e_sports", name: "Δ. Αντωνίου", role: "editor", sites: ["sportal", "outsidersbet"] },
  { id: "e_life", name: "Ε. Βλάχου", role: "editor", sites: ["muse", "klik", "exodos"] },
  { id: "e_general", name: "Θ. Σιδέρης", role: "editor", sites: ["*"] },
];

const worksOn = (u: User, site: string | null): boolean =>
  !site || u.sites.includes("*") || u.sites.includes(site);

export const userById = (id: string | null | undefined): User | undefined =>
  USERS.find((u) => u.id === id);

export const usersByRole = (role: Role): User[] =>
  USERS.filter((u) => u.role === role);

export const writersForSite = (site: string | null): User[] =>
  USERS.filter((u) => u.role === "writer" && worksOn(u, site) && u.available !== false);

export const editorsForSite = (site: string | null): User[] =>
  USERS.filter((u) => u.role === "editor" && worksOn(u, site));

// Per-site round-robin pointer for writer assignment (module-level; resets on
// reload — fine for the FE demo).
const rrPointer: Record<string, number> = {};

/** Next writer for a site via round-robin (skips unavailable). null if none. */
export function nextWriter(site: string | null): User | null {
  const pool = writersForSite(site);
  if (pool.length === 0) return null;
  const key = site ?? "_";
  const i = (rrPointer[key] ?? -1) + 1;
  rrPointer[key] = i;
  return pool[i % pool.length]!;
}

/** First editor for a site that is NOT the given writer (different-person guard). */
export function pickReviewer(site: string | null, assignee: string | null): User | null {
  const pool = editorsForSite(site).filter((e) => e.id !== assignee);
  return pool[0] ?? null;
}

export const DEFAULT_USER = "lead";

export const roleLabel: Record<Role, string> = {
  writer: "Συντάκτης",
  editor: "Επιμελητής",
  lead: "Αρχισυντάκτης",
};

// Initials for the avatar chip.
export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
