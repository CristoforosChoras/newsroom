// ─────────────────────────────────────────────────────────────────────────────
// AuthProvider — the ONE interface all app code talks to for identity.
//
// Components/stores depend on this interface and the `authProvider` singleton in
// ./index.ts — never on a concrete implementation. Swapping the mock for real
// auth (JWT/OAuth/our backend) is a one-line change in ./index.ts; nothing here
// or downstream changes. Every method is async so a real provider can hit the
// network without altering any call site.
// ─────────────────────────────────────────────────────────────────────────────

import type { AuthRole } from "@/lib/config/permissions";

/** The authenticated identity. `role` is the RBAC access role (≠ content Role). */
export interface AuthUser {
  id: string;
  name: string; // Greek display name
  email: string;
  role: AuthRole;
}

/** A session/token pair. `token` is a fake string today; a real JWT later. */
export interface Session {
  user: AuthUser;
  token: string;
  issuedAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

export interface AuthProvider {
  /** Resolve to a Session on success; throw AuthError on failure. */
  login(email: string, password?: string): Promise<Session>;
  logout(): Promise<void>;
  /** Validate/restore a session (e.g. re-verify a token). null if invalid. */
  getSession(session: Session | null): Promise<Session | null>;
  /** Convenience accessor over getSession(). */
  getCurrentUser(session: Session | null): Promise<AuthUser | null>;
}

/** Thrown by providers on a failed/invalid login. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
