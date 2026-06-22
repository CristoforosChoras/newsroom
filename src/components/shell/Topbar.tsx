"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, LogOut, Menu, Newspaper, Play } from "lucide-react";
import { SITES } from "@/lib/config/sites";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { useAuth } from "@/lib/store/useAuth";
import { USERS, roleLabel } from "@/lib/config/team";
import { docFor } from "@/lib/config/pageDocs";
import { T } from "@/lib/config/strings";
import Button from "@/components/ui/Button";
import AuthSwitcher from "@/components/auth/AuthSwitcher";
import ThemeToggle from "./ThemeToggle";
import styles from "./Topbar.module.css";

// Global actions belong to the production surfaces only — Dashboard & Newsroom.
const ACTION_ROUTES = new Set(["/", "/newsroom"]);

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const scope = useNewsroom((s) => s.scope);
  const setScope = useNewsroom((s) => s.setScope);
  const morning = useNewsroom((s) => s.morning);
  const pullInbox = useNewsroom((s) => s.pullInbox);
  const currentUser = useNewsroom((s) => s.currentUser);
  const setCurrentUser = useNewsroom((s) => s.setCurrentUser);
  const logout = useAuth().logout;

  const doc = docFor(pathname);
  const showActions = ACTION_ROUTES.has(pathname);

  // Stay on the current page — these refresh data in the background, no navigation.
  const onPullAmna = () => void pullInbox();
  const onMorning = () => void morning();

  return (
    <header className={styles.topbar}>
      <button
        className={styles.menuBtn}
        onClick={onMenu}
        aria-label={T.topbar.openMenu}
      >
        <Menu size={20} />
      </button>

      {/* page-aware title + one-line tagline → every tab reads differently */}
      <div className={styles.titleWrap}>
        <span className={styles.title}>{doc.title}</span>
        {doc.tagline && <div className={styles.tagline}>{doc.tagline}</div>}
      </div>

      <div className={styles.selectWrap}>
        <select
          className={styles.select}
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="all">{T.topbar.allNetwork}</option>
          {SITES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronRight size={14} color="var(--dim)" className={styles.chevron} />
      </div>

      {/* dev current-user switcher — replaced by real auth next iteration */}
      <div className={styles.selectWrap} title={T.topbar.viewAsDev}>
        <select
          className={styles.select}
          value={currentUser}
          onChange={(e) => setCurrentUser(e.target.value)}
        >
          {USERS.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {roleLabel[u.role]}
            </option>
          ))}
        </select>
        <ChevronRight size={14} color="var(--dim)" className={styles.chevron} />
      </div>

      {/* RBAC identity switcher (dev) — flips access role/permissions live.
          Separate from the team switcher above (content-workflow assignment). */}
      <AuthSwitcher />
      <button
        className={styles.logout}
        onClick={logout}
        aria-label={T.auth.logout}
        title={T.auth.logout}
      >
        <LogOut size={17} />
      </button>

      {showActions && (
        <div className={styles.actions}>
          <Button variant="soft" icon={Newspaper} onClick={onPullAmna} small>
            {T.topbar.pullAmna}
          </Button>
          <Button icon={Play} onClick={onMorning}>
            {T.topbar.updateNetwork}
          </Button>
        </div>
      )}

      {/* Always the last child → fixed in the top-right corner on every page,
          whether or not the action buttons are present. */}
      <ThemeToggle />
    </header>
  );
}
