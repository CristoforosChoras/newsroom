// ─────────────────────────────────────────────────────────────────────────────
// THE SINGLE SWAP POINT for authentication.
//
// All app code imports `authProvider` (and the auth types) from "@/lib/auth".
// To switch from the mock to real auth (JWT/OAuth/our backend), change ONLY the
// one line below to construct the real provider — it must satisfy AuthProvider.
// Nothing else (permissions config, store, hooks, guards, UI gating) changes.
// ─────────────────────────────────────────────────────────────────────────────

import { MockAuthProvider } from "./MockAuthProvider";
import type { AuthProvider } from "./AuthProvider";

// ⇩⇩⇩  SWAP POINT — replace MockAuthProvider with the real provider here. ⇩⇩⇩
export const authProvider: AuthProvider = new MockAuthProvider();
// ⇧⇧⇧  …and only here.                                                    ⇧⇧⇧

export type { AuthProvider, AuthUser, Session } from "./AuthProvider";
export { AuthError } from "./AuthProvider";
export { DEMO_USERS } from "./MockAuthProvider";
