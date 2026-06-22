// ─────────────────────────────────────────────────────────────────────────────
// Auth store — holds the RBAC session + runtime overrides, persisted to
// localStorage ("auth-v1"). Modeled on useNewsroom (persist + skipHydration +
// manual rehydrate). Kept SEPARATE from useNewsroom so logout never touches
// board state and the two lifecycles stay independent.
//
// Exposed facade hooks (useAuth / useCan / useHasRole) are the ONLY thing
// components should use for authorization. They read from this store and the
// permissions matrix in config/permissions.ts.
//
// ⚠️ Client-side UX only — see config/permissions.ts security note.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authProvider, type Session } from "@/lib/auth";
import {
  AUTH_ROLES,
  ROLE_PERMISSIONS,
  can,
  type AuthRole,
  type Permission,
} from "@/lib/config/permissions";

type Matrix = Record<AuthRole, Permission[]>;

interface AuthState {
  session: Session | null;
  status: "idle" | "authenticated" | "unauthenticated";
  // null = use the default ROLE_PERMISSIONS; non-null = Admin-edited override.
  matrixOverride: Matrix | null;
  // Admin "user management" role assignments, keyed by demo user id.
  userRoleOverrides: Record<string, AuthRole>;
}

interface AuthActions {
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (email: string) => Promise<void>; // dev identity switcher
  togglePermission: (role: AuthRole, perm: Permission) => void;
  resetMatrix: () => void;
  setUserRole: (userId: string, role: AuthRole) => void;
}

type AuthStore = AuthState & AuthActions;

// Server-safe storage (same guard as useNewsroom): no-op on the server, real
// localStorage in the browser. With skipHydration we rehydrate manually.
const storage = createJSONStorage<AuthState>(() => {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  return window.localStorage;
});

// Apply a user-management role override on top of the provider's session.
function withRoleOverride(
  session: Session,
  overrides: Record<string, AuthRole>,
): Session {
  const override = overrides[session.user.id];
  return override
    ? { ...session, user: { ...session.user, role: override } }
    : session;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      session: null,
      status: "idle",
      matrixOverride: null,
      userRoleOverrides: {},

      login: async (email, password) => {
        try {
          const session = await authProvider.login(email, password);
          set({
            session: withRoleOverride(session, get().userRoleOverrides),
            status: "authenticated",
          });
          return true;
        } catch {
          set({ session: null, status: "unauthenticated" });
          return false;
        }
      },

      logout: () => {
        void authProvider.logout();
        set({ session: null, status: "unauthenticated" });
      },

      switchUser: async (email) => {
        await get().login(email);
      },

      togglePermission: (role, perm) =>
        set((s) => {
          const base = s.matrixOverride ?? ROLE_PERMISSIONS;
          const next = {} as Matrix;
          for (const r of AUTH_ROLES) next[r] = [...base[r]];
          next[role] = next[role].includes(perm)
            ? next[role].filter((p) => p !== perm)
            : [...next[role], perm];
          return { matrixOverride: next };
        }),

      resetMatrix: () => set({ matrixOverride: null }),

      setUserRole: (userId, role) =>
        set((s) => ({
          userRoleOverrides: { ...s.userRoleOverrides, [userId]: role },
          // reflect immediately if it's the logged-in user
          session:
            s.session && s.session.user.id === userId
              ? { ...s.session, user: { ...s.session.user, role } }
              : s.session,
        })),
    }),
    {
      name: "auth-v1",
      storage,
      skipHydration: true,
      partialize: (s) => ({
        session: s.session,
        status: s.status,
        matrixOverride: s.matrixOverride,
        userRoleOverrides: s.userRoleOverrides,
      }),
    },
  ),
);

// ── Facade hooks (the public authorization API) ──────────────────────────────

/** Effective role of the logged-in user (applying any user-management override). */
function useEffectiveRole(): AuthRole | null {
  return useAuthStore((s) =>
    s.session
      ? (s.userRoleOverrides[s.session.user.id] ?? s.session.user.role)
      : null,
  );
}

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const role = useEffectiveRole();
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const switchUser = useAuthStore((s) => s.switchUser);
  return {
    user: session && role ? { ...session.user, role } : null,
    role,
    isAuthenticated: !!session,
    login,
    logout,
    switchUser,
  };
}

/** Returns `can(permission)` for the current user, honoring the matrix override. */
export function useCan() {
  const role = useEffectiveRole();
  const matrix = useAuthStore((s) => s.matrixOverride);
  return useCallback(
    (perm: Permission) => !!role && can(role, perm, matrix ?? ROLE_PERMISSIONS),
    [role, matrix],
  );
}

/** Returns `hasRole(role)` for the current user. */
export function useHasRole() {
  const role = useEffectiveRole();
  return useCallback((r: AuthRole) => role === r, [role]);
}

/**
 * True once the persisted auth state has rehydrated. Guards against the
 * first-paint flash where `session` is null pre-rehydrate (skipHydration).
 */
export function useAuthHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useAuthStore.persist.onFinishHydration(onChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false, // server snapshot: never hydrated during SSR
  );
}
