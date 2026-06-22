"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  TrendingUp,
  Swords,
  FileText,
  Bot,
  BookOpen,
  Users,
  Radio,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SITES } from "@/lib/config/sites";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { useCan } from "@/lib/store/useAuth";
import { T } from "@/lib/config/strings";
import type { Permission } from "@/lib/config/permissions";
import StatusLight from "@/components/ui/StatusLight";
import styles from "./Sidebar.module.css";

// `permission` mirrors ROUTE_PERMISSIONS in config/permissions.ts. Entries the
// current role can't access are filtered out below. null = any authenticated user.
const NAV: {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission | null;
}[] = [
  { href: "/", label: T.shell.nav.dashboard, icon: LayoutDashboard, permission: "analytics.view" },
  { href: "/newsroom", label: T.shell.nav.newsroom, icon: Newspaper, permission: "newsroom.view" },
  { href: "/trends", label: T.shell.nav.trends, icon: TrendingUp, permission: "trends.view" },
  { href: "/gaps", label: T.shell.nav.gaps, icon: Swords, permission: "competition.view" },
  { href: "/reports", label: T.shell.nav.reports, icon: FileText, permission: "analytics.view" },
  { href: "/agents", label: T.shell.nav.agents, icon: Bot, permission: "settings.manage" },
  { href: "/glossary", label: T.shell.nav.glossary, icon: BookOpen, permission: null },
  { href: "/users", label: T.shell.nav.users, icon: Users, permission: "users.view" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const siteKpi = useNewsroom((s) => s.siteKpi);
  const can = useCan();
  // hide nav items the current role can't access (UX gating; not security)
  const nav = NAV.filter((n) => !n.permission || can(n.permission));

  return (
    <>
      {open && <div className={styles.navBackdrop} onClick={onClose} />}
      <aside
        className={[styles.sidebar, open ? styles.sidebarOpen : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.brand}>
          <div className={styles.logo}>
            <Radio size={17} color="#0a0a0b" />
          </div>
          <div className={styles.brandText}>
            <div className={styles.brandName}>{T.shell.brandName}</div>
            <div className={styles.brandSub}>{T.shell.brandSub}</div>
          </div>
          <button
            className={styles.closeNav}
            onClick={onClose}
            aria-label={T.shell.closeMenu}
          >
            <X size={18} />
          </button>
        </div>

        <nav className={styles.nav}>
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                title={n.label}
                onClick={onClose}
                className={[styles.navItem, active ? styles.active : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                <n.icon size={17} className={styles.navIcon} />
                <span className={styles.navLabel}>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.network}>
          <div className={styles.networkLabel}>{T.shell.networkLabel}</div>
          {SITES.map((s) => {
            const connected = siteKpi[s.id]?.wp;
            return (
              <div key={s.id} className={styles.site}>
                <span
                  className={styles.siteDot}
                  style={{ background: s.color }}
                />
                {s.name}
                <span
                  className={connected ? styles.statusWrap : "pulse"}
                  style={{ marginLeft: "auto", display: "inline-flex" }}
                >
                  <StatusLight s={connected ? "green" : "red"} />
                </span>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
