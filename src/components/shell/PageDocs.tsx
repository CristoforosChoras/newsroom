"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, ChevronDown } from "lucide-react";
import { docFor } from "@/lib/config/pageDocs";
import styles from "./PageDocs.module.css";

// Consistent in-page documentation toggle on EVERY page — same pattern as the
// Reports "Τι ελέγχει" panel: a labelled button that reveals a "πώς δουλεύει & γιατί"
// panel. Collapsed by default so it never competes with the page content.
export default function PageDocs() {
  const pathname = usePathname();
  const doc = docFor(pathname);
  // Track WHICH path the panel was opened for. The Shell (and this component)
  // persists across navigation, so deriving `open` from the path makes it collapse
  // automatically when you change page — no effect / setState needed.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  if (doc.how.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <button
        className={[styles.toggle, open ? styles.toggleOpen : ""]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setOpenPath(open ? null : pathname)}
      >
        <HelpCircle size={14} />
        Πώς δουλεύει & γιατί
        <ChevronDown
          size={14}
          className={[styles.chev, open ? styles.chevOpen : ""]
            .filter(Boolean)
            .join(" ")}
        />
      </button>

      {open && (
        <div className={styles.panel}>
          <ul className={styles.list}>
            {doc.how.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
