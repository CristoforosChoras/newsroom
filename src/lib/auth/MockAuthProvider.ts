// ─────────────────────────────────────────────────────────────────────────────
// MockAuthProvider — DUMMY identity provider (no real authentication).
//
// A hardcoded demo user per RBAC role, a fake token, and a login() that accepts
// any of the demo emails WITHOUT verifying the password. The auth store owns
// persistence; this provider only mints/validates Session objects.
//
// ⚠️ This is NOT secure. It exists so the roles/permissions, guards, and UI
// gating can be built and tested for real while the identity layer is a stub.
// Replace it with a real provider at the single swap point in ./index.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { AuthProvider, AuthUser, Session } from "./AuthProvider";
import { AuthError } from "./AuthProvider";

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

// One demo account per role — listed on the login screen so each role is easy
// to test. Any password is accepted.
export const DEMO_USERS: AuthUser[] = [
  { id: "u_admin", name: "Δ. Διαχειριστής", email: "admin@matrix.gr", role: "Admin" },
  { id: "u_editor", name: "Ε. Επιμελήτρια", email: "editor@matrix.gr", role: "Editor" },
  { id: "u_journalist", name: "Γ. Δημοσιογράφος", email: "journalist@matrix.gr", role: "Journalist" },
  { id: "u_analyst", name: "Α. Αναλυτής", email: "analyst@matrix.gr", role: "Analyst" },
  { id: "u_viewer", name: "Θ. Θεατής", email: "viewer@matrix.gr", role: "Viewer" },
];

function mintToken(): string {
  // Browsers + Node 18+ expose crypto.randomUUID; fall back just in case.
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `mock-${uuid}`;
}

function sessionFor(user: AuthUser): Session {
  const now = Date.now();
  return { user, token: mintToken(), issuedAt: now, expiresAt: now + EIGHT_HOURS };
}

export class MockAuthProvider implements AuthProvider {
  async login(email: string, _password?: string): Promise<Session> {
    const user = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!user) {
      throw new AuthError(`Άγνωστος χρήστης: ${email}`);
    }
    // No password check — this is the mock.
    return sessionFor(user);
  }

  async logout(): Promise<void> {
    // Nothing to revoke in the mock; the store clears its own state.
  }

  async getSession(session: Session | null): Promise<Session | null> {
    if (!session) return null;
    // Mock "validation" = local expiry check. A real provider re-verifies the
    // token with the backend here.
    if (session.expiresAt <= Date.now()) return null;
    return session;
  }

  async getCurrentUser(session: Session | null): Promise<AuthUser | null> {
    const valid = await this.getSession(session);
    return valid?.user ?? null;
  }
}
