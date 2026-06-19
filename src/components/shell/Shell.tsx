"use client";

import { useEffect, useState } from "react";
import { useNewsroom } from "@/lib/store/useNewsroom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import PageDocs from "./PageDocs";
import StoreHydration from "./StoreHydration";
import Toast from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CellDrawer from "@/components/drawer/CellDrawer";
import ArticleEditor from "@/components/editor/ArticleEditor";
import TrendIdea from "@/components/trends/TrendIdea";
import styles from "./Shell.module.css";

export default function Shell({ children }: { children: React.ReactNode }) {
  const open = useNewsroom((s) => s.open);
  const editing = useNewsroom((s) => s.editing);
  const trendIdea = useNewsroom((s) => s.trendIdea);
  const confirm = useNewsroom((s) => s.confirm);
  const closeConfirm = useNewsroom((s) => s.closeConfirm);
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile nav slide-over when the viewport grows to desktop.
  // (Closing on navigation is handled by the nav links' onClick.)
  useEffect(() => {
    const f = () => {
      if (window.innerWidth >= 680) setNavOpen(false);
    };
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  return (
    <div className={styles.shell}>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className={styles.main}>
        <Topbar onMenu={() => setNavOpen(true)} />
        <main className={styles.content}>
          <PageDocs />
          {children}
        </main>
      </div>

      {open && <CellDrawer />}
      {editing && <ArticleEditor />}
      {trendIdea && <TrendIdea />}
      <ConfirmDialog
        open={!!confirm}
        message={confirm?.message ?? ""}
        title={confirm?.title}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onCancel={closeConfirm}
        onConfirm={() => {
          confirm?.onConfirm();
          closeConfirm();
        }}
      />
      <Toast />
      <StoreHydration />
    </div>
  );
}
