"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { GLOSSARY } from "@/lib/config/glossary";
import { T } from "@/lib/config/strings";
import Panel from "@/components/ui/Panel";
import styles from "./Glossary.module.css";

// Accent-insensitive lowercase for search (πό = πο).
const norm = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export default function Glossary() {
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const query = norm(q);
    if (!query) return GLOSSARY;
    return GLOSSARY.map((g) => ({
      ...g,
      terms: g.terms.filter(
        (t) =>
          norm(t.term).includes(query) ||
          (t.abbr ? norm(t.abbr).includes(query) : false) ||
          norm(t.def).includes(query),
      ),
    })).filter((g) => g.terms.length > 0);
  }, [q]);

  const total = GLOSSARY.reduce((n, g) => n + g.terms.length, 0);

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.intro}>
          {T.glossary.intro(total, GLOSSARY.length)}
        </div>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.search}
            placeholder={T.glossary.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.groups}>
        {groups.map((g) => (
          <Panel key={g.title} pad={16}>
            <div className={styles.groupTitle}>
              <BookOpen size={14} color="var(--orange)" />
              {g.title}
            </div>
            <dl className={styles.list}>
              {g.terms.map((t) => (
                <div key={t.term} className={styles.row}>
                  <dt className={styles.term}>
                    {t.term}
                    {t.abbr && t.abbr !== t.term && (
                      <span className={styles.abbr}>{t.abbr}</span>
                    )}
                  </dt>
                  <dd className={styles.def}>{t.def}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        ))}

        {groups.length === 0 && (
          <Panel className={styles.empty}>{T.glossary.empty(q)}</Panel>
        )}
      </div>
    </div>
  );
}
