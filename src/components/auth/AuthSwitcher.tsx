"use client";

import { DEMO_USERS } from "@/lib/auth";
import { useAuth } from "@/lib/store/useAuth";
import { roleLabelAuth } from "@/lib/config/permissions";
import { T } from "@/lib/config/strings";
import Select from "@/components/ui/Select";

/**
 * Dev-only identity switcher: jump between RBAC demo users (flips role &
 * permissions live) without re-login. Distinct from the team current-user
 * switcher in the topbar (which sets content-workflow assignment). Replaced by
 * real auth at the swap point.
 */
export default function AuthSwitcher() {
  const { user, switchUser, isAuthenticated } = useAuth();
  if (!isAuthenticated || !user) return null;

  return (
    <Select
      title={T.auth.loginAs}
      value={user.email}
      onChange={(email) => void switchUser(email)}
      options={DEMO_USERS.map((u) => ({
        value: u.email,
        label: `${u.name} · ${roleLabelAuth[u.role]}`,
      }))}
    />
  );
}
