"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  TrendingUp,
  Lightbulb,
  FileText,
  Bot,
  BookOpen,
  Radio,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SITES } from "@/lib/config/sites";
import { useNewsroom } from "@/lib/store/useNewsroom";
import StatusLight from "@/components/ui/StatusLight";
import styles from "./Sidebar.module.css";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/newsroom", label: "Newsroom", icon: Newspaper },
  { href: "/trends", label: "Trend Radar", icon: TrendingUp },
  { href: "/gaps", label: "Content Gaps", icon: Lightbulb },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/glossary", label: "Γλωσσάρι", icon: BookOpen },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const siteKpi = useNewsroom((s) => s.siteKpi);

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
            <div className={styles.brandName}>MATRIX</div>
            <div className={styles.brandSub}>NEWSROOM CORE</div>
          </div>
          <button
            className={styles.closeNav}
            onClick={onClose}
            aria-label="Κλείσιμο μενού"
          >
            <X size={18} />
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV.map((n) => {
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
          <div className={styles.networkLabel}>WORDPRESS NETWORK</div>
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
