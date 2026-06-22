"use client";

import { Users as UsersIcon, ShieldCheck, RotateCcw } from "lucide-react";
import { DEMO_USERS } from "@/lib/auth";
import { useAuthStore, useCan } from "@/lib/store/useAuth";
import {
  ALL_PERMISSIONS,
  AUTH_ROLES,
  ROLE_PERMISSIONS,
  can,
  roleLabelAuth,
  type AuthRole,
} from "@/lib/config/permissions";
import { initials } from "@/lib/config/team";
import { T } from "@/lib/config/strings";
import Panel from "@/components/ui/Panel";
import Eyebrow from "@/components/ui/Eyebrow";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import styles from "./Users.module.css";

const ROLE_OPTIONS = AUTH_ROLES.map((r) => ({ value: r, label: roleLabelAuth[r] }));

export default function Users() {
  const can_ = useCan();
  const canManage = can_("users.manage");

  const userRoleOverrides = useAuthStore((s) => s.userRoleOverrides);
  const matrixOverride = useAuthStore((s) => s.matrixOverride);
  const setUserRole = useAuthStore((s) => s.setUserRole);
  const togglePermission = useAuthStore((s) => s.togglePermission);
  const resetMatrix = useAuthStore((s) => s.resetMatrix);

  const matrix = matrixOverride ?? ROLE_PERMISSIONS;

  return (
    <div className={styles.page}>
      <p className={styles.intro}>{T.auth.usersIntro}</p>

      {/* ── Users list ─────────────────────────────────────────────── */}
      <Panel>
        <Eyebrow icon={UsersIcon}>{T.auth.usersTitle}</Eyebrow>
        <div className={styles.table}>
          <div className={[styles.row, styles.head].join(" ")}>
            <span>{T.auth.colUser}</span>
            <span className={styles.colEmail}>{T.auth.colEmail}</span>
            <span className={styles.colRole}>{T.auth.colRole}</span>
          </div>
          {DEMO_USERS.map((u) => {
            const role: AuthRole = userRoleOverrides[u.id] ?? u.role;
            return (
              <div key={u.id} className={styles.row}>
                <span className={styles.user}>
                  <span className={styles.avatar}>{initials(u.name)}</span>
                  {u.name}
                </span>
                <span className={styles.colEmail}>{u.email}</span>
                <span className={styles.colRole}>
                  {canManage ? (
                    <Select
                      value={role}
                      onChange={(r) => setUserRole(u.id, r as AuthRole)}
                      options={ROLE_OPTIONS}
                    />
                  ) : (
                    <span className={styles.roleTag}>{roleLabelAuth[role]}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ── Editable role → permission matrix ──────────────────────── */}
      <Panel>
        <div className={styles.matrixHeader}>
          <Eyebrow icon={ShieldCheck}>{T.auth.matrixTitle}</Eyebrow>
          {canManage && matrixOverride && (
            <Button variant="ghost" icon={RotateCcw} small onClick={resetMatrix}>
              {T.auth.resetMatrix}
            </Button>
          )}
        </div>
        <p className={styles.matrixIntro}>
          {T.auth.matrixIntro}
          {matrixOverride && (
            <span className={styles.overridden}> · {T.auth.matrixOverridden}</span>
          )}
        </p>

        <div className={styles.matrixScroll}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th className={styles.permCol}></th>
                {AUTH_ROLES.map((r) => (
                  <th key={r} className={styles.roleHead}>
                    {roleLabelAuth[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((perm) => (
                <tr key={perm}>
                  <td className={styles.permCol}>
                    <code className={styles.permName}>{perm}</code>
                  </td>
                  {AUTH_ROLES.map((r) => (
                    <td key={r} className={styles.cell}>
                      <input
                        type="checkbox"
                        className={styles.check}
                        checked={can(r, perm, matrix)}
                        disabled={!canManage}
                        aria-label={`${roleLabelAuth[r]} — ${perm}`}
                        onChange={() => togglePermission(r, perm)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
