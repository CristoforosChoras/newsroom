// ─────────────────────────────────────────────────────────────────────────────
// RBAC — roles, permissions & route gates (SINGLE SOURCE OF TRUTH).
//
// This is the access-control model: which RBAC role may do what, and which
// permission a route requires. It is deliberately separate from the content
// *workflow* role in types.ts/team.ts (writer/editor/lead), which governs draft
// assignment — the two coexist.
//
// ⚠️ SECURITY: every check built on this file is CLIENT-SIDE UX ONLY. It hides
// or disables things the user can't use; it does NOT secure anything. Anyone can
// edit localStorage ("auth-v1") to grant themselves any role. Real enforcement
// must happen server-side once real auth lands (see README → real-auth swap).
//
// Roles and the matrix below are meant to be trivially editable. The Admin
// "User Management" screen can also override the matrix at runtime (persisted in
// the auth store); the helpers here accept that override as an argument.
// ─────────────────────────────────────────────────────────────────────────────

export type AuthRole = "Admin" | "Editor" | "Journalist" | "Analyst" | "Viewer";

export type Permission =
  | "newsroom.view"
  | "newsroom.manage"
  | "trends.view"
  | "trends.generate"
  | "competition.view"
  | "competition.run"
  | "analytics.view"
  | "analytics.export"
  | "drafts.create"
  | "drafts.approve"
  | "drafts.publish"
  | "users.view"
  | "users.manage"
  | "settings.manage";

export const ALL_PERMISSIONS: Permission[] = [
  "newsroom.view",
  "newsroom.manage",
  "trends.view",
  "trends.generate",
  "competition.view",
  "competition.run",
  "analytics.view",
  "analytics.export",
  "drafts.create",
  "drafts.approve",
  "drafts.publish",
  "users.view",
  "users.manage",
  "settings.manage",
];

export const AUTH_ROLES: AuthRole[] = [
  "Admin",
  "Editor",
  "Journalist",
  "Analyst",
  "Viewer",
];

// Default role → permission matrix. Edit freely — this is the seed/fallback the
// runtime override layers on top of.
export const ROLE_PERMISSIONS: Record<AuthRole, Permission[]> = {
  // Everything, including user & settings management.
  Admin: [...ALL_PERMISSIONS],

  // Runs the newsroom; no user management.
  Editor: [
    "newsroom.view",
    "newsroom.manage",
    "trends.view",
    "trends.generate",
    "competition.view",
    "competition.run",
    "analytics.view",
    "drafts.create",
    "drafts.approve",
    "drafts.publish",
  ],

  // Produces content; can generate/run, create drafts, no approve/publish.
  Journalist: [
    "newsroom.view",
    "trends.view",
    "trends.generate",
    "competition.view",
    "competition.run",
    "drafts.create",
    "analytics.view",
  ],

  // Read-only on content; owns analytics export + competition viewing.
  Analyst: ["analytics.view", "analytics.export", "competition.view"],

  // *.view only.
  Viewer: [
    "newsroom.view",
    "trends.view",
    "competition.view",
    "analytics.view",
  ],
};

// Greek display labels for the RBAC roles (UI copy convention: el-GR strings).
export const roleLabelAuth: Record<AuthRole, string> = {
  Admin: "Διαχειριστής",
  Editor: "Επιμελητής",
  Journalist: "Δημοσιογράφος",
  Analyst: "Αναλυτής",
  Viewer: "Θεατής",
};

// Route → required permission. `null` = any authenticated user may enter.
// Keep keys in sync with the App Router paths under src/app/(app)/.
export const ROUTE_PERMISSIONS: Record<string, Permission | null> = {
  "/": "analytics.view", // GA4 dashboard (home)
  "/newsroom": "newsroom.view",
  "/trends": "trends.view",
  "/gaps": "competition.view", // Competition Analysis
  "/reports": "analytics.view",
  "/agents": "settings.manage",
  "/glossary": null, // reference — any authenticated user
  "/users": "users.view", // Admin user management
};

/** Does `role` hold `perm`, under the given matrix (defaults to the static one)? */
export function can(
  role: AuthRole,
  perm: Permission,
  matrix: Record<AuthRole, Permission[]> = ROLE_PERMISSIONS,
): boolean {
  return matrix[role]?.includes(perm) ?? false;
}

/** All permissions for `role` under the given matrix. */
export function permissionsForRole(
  role: AuthRole,
  matrix: Record<AuthRole, Permission[]> = ROLE_PERMISSIONS,
): Permission[] {
  return matrix[role] ?? [];
}

/**
 * Required permission for a pathname. Exact match first, then the longest route
 * prefix (so nested routes like /newsroom/123 inherit /newsroom's gate).
 * Returns `undefined` for unknown routes (caller decides; we treat it as "allow
 * any authenticated user"). Returns `null` for routes explicitly open to all.
 */
export function permissionForRoute(
  pathname: string,
): Permission | null | undefined {
  if (pathname in ROUTE_PERMISSIONS) return ROUTE_PERMISSIONS[pathname];
  let best: { len: number; perm: Permission | null } | null = null;
  for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
    if (route === "/") continue; // "/" only matches exactly (handled above)
    if (pathname === route || pathname.startsWith(route + "/")) {
      if (!best || route.length > best.len) best = { len: route.length, perm };
    }
  }
  return best?.perm;
}
