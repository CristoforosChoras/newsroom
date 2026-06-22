"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Client route guard for all (app) routes.
//
// ⚠️ UX ONLY — this hides pages the user can't use; it is NOT security. The real
// enforcement layer is server-side (Proxy + DAL), added with real auth. Anyone
// can edit localStorage to bypass this. See config/permissions.ts / README.
//
// It is a client component using usePathname(), so it re-evaluates on every
// navigation even though Next 16 layouts don't re-render. The hydration gate
// prevents the first-paint flash where the persisted session isn't loaded yet.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth, useCan, useAuthHydrated } from "@/lib/store/useAuth";
import { permissionForRoute } from "@/lib/config/permissions";
import { T } from "@/lib/config/strings";
import Panel from "@/components/ui/Panel";
import styles from "./ProtectedRoute.module.css";

function AuthSplash() {
  return (
    <div className={styles.splash} role="status" aria-live="polite">
      {T.auth.loading}
    </div>
  );
}

function NoAccess() {
  return (
    <div className={styles.center}>
      <Panel className={styles.noAccess}>
        <ShieldAlert size={30} color="var(--amber)" />
        <h2 className={styles.naTitle}>{T.auth.noAccessTitle}</h2>
        <p className={styles.naBody}>{T.auth.noAccessBody}</p>
        <Link href="/" className={styles.naLink}>
          {T.auth.backToDashboard}
        </Link>
      </Panel>
    </div>
  );
}

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const can = useCan();
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace("/login");
  }, [hydrated, isAuthenticated, pathname, router]);

  // Wait for persisted state before deciding anything (avoids redirect flash).
  if (!hydrated) return <AuthSplash />;
  // Unauthenticated → blank while the redirect above runs.
  if (!isAuthenticated) return <AuthSplash />;

  const perm = permissionForRoute(pathname);
  if (perm && !can(perm)) return <NoAccess />;

  return <>{children}</>;
}
