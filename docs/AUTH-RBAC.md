# Auth & RBAC — how it works, how to use it, how to swap in real auth

Login + role-based access control for MATRIX. The **identity provider is a mock**
(no real password check) — but the roles, permissions, route guards, and UI gating
are real and final. Only the mock provider is replaced with real auth later, at
**one documented place**.

> ⚠️ **SECURITY CAVEAT — these checks are UX only, NOT security.** The mock does not
> verify passwords and the session token is fake. Anyone can edit `localStorage`
> (`auth-v1`) to grant themselves any role. **Real security MUST be enforced
> server-side** once real auth is added (see §6). Hiding a button does not protect
> the underlying action.

---

## 1. Architecture (end to end)

```
 ┌──────────────────────────────── identity (swappable) ────────────────────────────────┐
 │  AuthProvider interface  ──  MockAuthProvider (demo users, fake token, no password)   │
 │        src/lib/auth/AuthProvider.ts        src/lib/auth/MockAuthProvider.ts            │
 │                         ▲                                                              │
 │   THE SINGLE SWAP POINT: src/lib/auth/index.ts → `export const authProvider = …`      │
 └─────────────────────────┼─────────────────────────────────────────────────────────────┘
                           │  login()/getSession() (async — real provider can hit network)
 ┌─────────────────────────┼──────────────────── app (client-side) ─────────────────────┐
 │  useAuth store (zustand, persisted "auth-v1")   src/lib/store/useAuth.ts              │
 │     • session + status                                                                │
 │     • matrixOverride      ← Admin-edited role→permission matrix                       │
 │     • userRoleOverrides   ← Admin-edited role assignments                             │
 │                                                                                       │
 │  permissions config (single source of truth)    src/lib/config/permissions.ts        │
 │     ROLE_PERMISSIONS (matrix) · ROUTE_PERMISSIONS (route gates) · can()/…             │
 │                                                                                       │
 │  facade hooks: useAuth() · useCan() · useHasRole()                                    │
 │        │                 │                                                            │
 │        ▼                 ▼                                                            │
 │  <ProtectedRoute>   Sidebar nav filter + inline button gating (create/approve/…)      │
 │  (redirect /login,  src/components/shell/Sidebar.tsx · Board/CellDrawer/TrendIdea/Gaps │
 │   "no access")                                                                        │
 └───────────────────────────────────────────────────────────────────────────────────────┘
```

The app talks **only** to the `AuthProvider` interface and the `authProvider`
singleton from `@/lib/auth` — never to `MockAuthProvider` directly. That is what
makes the swap a one-line change.

---

## 2. How to use it

1. Visit any page → you are redirected to **`/login`** (a chrome-free screen with
   no sidebar/topbar).
2. Pick a demo user from the list (or type the email) and submit. **Any password is
   accepted** — the mock does not check it.
3. The session persists across reloads (localStorage `auth-v1`).
4. **Switch roles live** without logging out via the **dev identity switcher** in
   the topbar. It is separate from the team "view as (dev)" switcher next to it,
   which controls content-workflow *assignment* (writer/editor/lead), not access.
5. **Admin → Χρήστες (`/users`)**: list users, change their role, and toggle the
   **role→permission matrix**. Nav items and buttons appear/disappear immediately
   because guards read the same persisted matrix. "Reset to defaults" clears the
   override.
6. **Log out** with the icon at the right of the topbar.

### Demo users

| Email | Role | Sees / can do |
|---|---|---|
| `admin@matrix.gr` | **Admin** | Everything, incl. User Management & settings |
| `editor@matrix.gr` | **Editor** | Runs the newsroom: manage, generate, run, create/approve/publish. No user management |
| `journalist@matrix.gr` | **Journalist** | View newsroom, generate trends, run competition, create drafts, view analytics. No approve/publish, no users |
| `analyst@matrix.gr` | **Analyst** | Read-only on content; view + export analytics, view competition |
| `viewer@matrix.gr` | **Viewer** | `*.view` only — fully read-only |

---

## 3. Roles & permissions (single source of truth)

Everything lives in **`src/lib/config/permissions.ts`** and is trivially editable:

- `AuthRole` — the 5 RBAC roles (separate from the content `Role` in `types.ts`).
- `Permission` — 14 granular capabilities (`newsroom.view/manage`, `trends.view/generate`,
  `competition.view/run`, `analytics.view/export`, `drafts.create/approve/publish`,
  `users.view/manage`, `settings.manage`).
- `ROLE_PERMISSIONS: Record<AuthRole, Permission[]>` — the default matrix (the seed
  the Admin screen can override at runtime).
- `ROUTE_PERMISSIONS: Record<string, Permission | null>` — which permission each
  route requires (`null` = any authenticated user).
- Helpers `can(role, perm, matrix?)`, `permissionsForRole(...)`,
  `permissionForRoute(pathname)` — all accept the runtime matrix override.

| Permission | Admin | Editor | Journalist | Analyst | Viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| `newsroom.view` | ✓ | ✓ | ✓ |  | ✓ |
| `newsroom.manage` | ✓ | ✓ |  |  |  |
| `trends.view` | ✓ | ✓ | ✓ |  | ✓ |
| `trends.generate` | ✓ | ✓ | ✓ |  |  |
| `competition.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `competition.run` | ✓ | ✓ | ✓ |  |  |
| `analytics.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `analytics.export` | ✓ |  |  | ✓ |  |
| `drafts.create` | ✓ | ✓ | ✓ |  |  |
| `drafts.approve` | ✓ | ✓ |  |  |  |
| `drafts.publish` | ✓ | ✓ |  |  |  |
| `users.view` | ✓ |  |  |  |  |
| `users.manage` | ✓ |  |  |  |  |
| `settings.manage` | ✓ |  |  |  |  |

To add a role or permission: edit the unions + `ROLE_PERMISSIONS` (and
`roleLabelAuth` for the Greek label). To change what a route requires: edit
`ROUTE_PERMISSIONS` and the matching `permission` field in the Sidebar `NAV` array.

---

## 4. Enforcement (client-side, today)

- **Route guard** — `src/components/auth/ProtectedRoute.tsx`, mounted in the
  `(app)/` route group layout. Redirects unauthenticated users to `/login` and
  renders a clean "no access" panel for routes the role can't enter. It is a
  client component using `usePathname()`, so it re-evaluates on every navigation.
  A hydration gate (`useAuthHydrated`) prevents a first-paint redirect flash.
- **Nav filtering** — `src/components/shell/Sidebar.tsx` hides nav items whose
  `permission` the role lacks (via `useCan()`).
- **Inline UI gating** — action buttons are wrapped in `can(...)`:
  - Newsroom: create (`drafts.create`), approve/publish (`drafts.approve`/`drafts.publish`)
    in `Board.tsx` / `CellDrawer.tsx`.
  - Trends: generate ideas (`trends.generate`) in `TrendIdea.tsx`.
  - Competition: run analysis (`competition.run`) in `Gaps.tsx`.

---

## 5. Coexistence with the content-workflow role

There are **two independent role systems**, on purpose:

| | RBAC access role (this doc) | Content-workflow role |
|---|---|---|
| Values | Admin / Editor / Journalist / Analyst / Viewer | writer / editor / lead |
| Governs | Page access + feature visibility | Draft assignment (assignee/reviewer/lead) |
| Source | `config/permissions.ts` + `store/useAuth.ts` | `types.ts` + `config/team.ts` + `store/useNewsroom.ts` |
| Switcher | RBAC identity switcher (topbar) | "Προβολή ως (dev)" team switcher (topbar) |

The drawer's approve/publish requires **both** the workflow role (you must be the
reviewer) **and** the RBAC permission (`drafts.publish`).

---

## 6. Swapping the mock for real auth

**Change (4 things):**
1. **`src/lib/auth/index.ts`** — replace `new MockAuthProvider()` with the real
   provider (JWT/OAuth/our backend). One line. The only identity edit.
2. Add **`src/proxy.ts`** — Next.js 16 renamed Middleware → **Proxy**. Verify the
   session cookie and redirect unauthenticated requests server-side.
3. Add a Data Access Layer `verifySession()` and call it in every
   `src/app/api/agents/*/route.ts` handler — **the real enforcement layer** —
   returning 401/403 before doing any work.
4. Make `getSession()`/`getCurrentUser()` hit the real backend and re-validate the
   token on rehydrate.

**Stays unchanged:** `config/permissions.ts` (roles, matrix, route map), the
`useAuth` store, the `useAuth`/`useCan`/`useHasRole` hooks, `<ProtectedRoute>`, the
sidebar nav filter, and all inline UI gating — they depend on the interface, not
the mock, so they survive the swap untouched.

---

## 7. File map

| File | Responsibility |
|---|---|
| `src/lib/auth/AuthProvider.ts` | The interface + `AuthUser`/`Session` shapes + `AuthError` |
| `src/lib/auth/MockAuthProvider.ts` | Demo users, fake token, no password check |
| `src/lib/auth/index.ts` | **The single swap point** (`authProvider` singleton) |
| `src/lib/config/permissions.ts` | Roles, permissions, matrix, route gates, helpers |
| `src/lib/store/useAuth.ts` | Auth store + facade hooks (`useAuth`/`useCan`/`useHasRole`/`useAuthHydrated`) |
| `src/components/auth/AuthHydration.tsx` | Rehydrates the persisted session after mount |
| `src/components/auth/ProtectedRoute.tsx` | Route guard + "no access" state |
| `src/components/auth/Login.tsx` | Login screen (demo user list + caveat) |
| `src/components/auth/AuthSwitcher.tsx` | Dev identity switcher (topbar) |
| `src/components/users/Users.tsx` | Admin user management + editable matrix |
| `src/app/(app)/layout.tsx` | Wraps app routes in `ProtectedRoute` + `Shell` |
| `src/app/(auth)/login/page.tsx` | The `/login` route (chrome-free group) |

To reset auth state: clear `localStorage` key `auth-v1`.
