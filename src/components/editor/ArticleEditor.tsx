"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  CheckCircle2,
  ChevronDown,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Send,
  X,
} from "lucide-react";
import { siteById } from "@/lib/config/sites";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { slugify } from "@/lib/utils/slug";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import Eyebrow from "@/components/ui/Eyebrow";
import SiteTag from "@/components/ui/SiteTag";
import styles from "./ArticleEditor.module.css";

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

const TOOLS = [
  { cmd: "formatBlock", arg: "<p>", icon: Pilcrow, title: "Παράγραφος" },
  { cmd: "formatBlock", arg: "<h2>", icon: Heading2, title: "Επικεφαλίδα H2" },
  { cmd: "formatBlock", arg: "<h3>", icon: Heading3, title: "Επικεφαλίδα H3" },
  { cmd: "bold", arg: undefined, icon: Bold, title: "Έντονα" },
  { cmd: "italic", arg: undefined, icon: Italic, title: "Πλάγια" },
  { cmd: "insertUnorderedList", arg: undefined, icon: List, title: "Λίστα" },
  {
    cmd: "insertOrderedList",
    arg: undefined,
    icon: ListOrdered,
    title: "Αριθμημένη λίστα",
  },
  {
    cmd: "formatBlock",
    arg: "<blockquote>",
    icon: Quote,
    title: "Παράθεση",
  },
] as const;

export default function ArticleEditor() {
  const id = useNewsroom((s) => s.editing);
  const cell = useNewsroom((s) => s.cells.find((c) => c.id === s.editing));
  const close = useNewsroom((s) => s.closeEditor);
  const updateCell = useNewsroom((s) => s.updateCell);
  const publishWP = useNewsroom((s) => s.publishWP);

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [words, setWords] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false); // mobile "Άρθρο & SEO"

  // Initialize the (uncontrolled) contentEditable once per opened cell.
  useEffect(() => {
    if (!bodyRef.current || !cell) return;
    bodyRef.current.innerHTML = cell.body || "";
    setWords(countWords(bodyRef.current.innerText || ""));
    setSlugTouched(false);
    // Only re-run when the edited cell id changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!cell || !id) return null;
  const c = cell;
  const site = siteById(c.site);

  const saveBody = () => {
    if (!bodyRef.current) return;
    updateCell(c.id, { body: bodyRef.current.innerHTML });
    setWords(countWords(bodyRef.current.innerText || ""));
  };

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    bodyRef.current?.focus();
    saveBody();
  };

  const onLink = () => {
    const url = window.prompt("URL συνδέσμου:", "https://");
    if (url) exec("createLink", url);
  };

  const onTitle = (value: string) => {
    updateCell(c.id, { headline: value });
    if (!slugTouched) updateCell(c.id, { slug: slugify(value) });
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    const tags = c.tags ?? [];
    if (!tags.includes(v)) updateCell(c.id, { tags: [...tags, v] });
    setTagInput("");
  };

  const removeTag = (t: string) =>
    updateCell(c.id, { tags: (c.tags ?? []).filter((x) => x !== t) });

  const readingMin = Math.max(1, Math.ceil(words / 200));
  const excerpt = c.excerpt ?? "";
  const seoTitle = c.seoTitle ?? "";
  const seoDesc = c.seoDesc ?? "";

  return (
    <div className={styles.backdrop} onClick={close}>
      <div className={styles.editor} onClick={(e) => e.stopPropagation()}>
        {/* top bar */}
        <div className={styles.topbar}>
          <SiteTag id={c.site} />
          <span className={styles.topTitle}>Επεξεργασία άρθρου</span>
          <div className={styles.topActions}>
            {c.wpPostId ? (
              <span className={styles.publishedTop}>
                <CheckCircle2 size={16} />
                {site ? "Ενημερωμένο" : "Δημοσιευμένο"} · #{c.wpPostId}
              </span>
            ) : (
              <Button
                icon={Send}
                loading={c._publishing}
                disabled={!site}
                onClick={() => publishWP(c.id)}
              >
                Δημοσίευση {site ? `στο ${site.name}` : ""}
              </Button>
            )}
            <button className={styles.closeBtn} onClick={close} aria-label="Κλείσιμο">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {/* main column */}
          <div className={styles.main}>
            <label className={styles.fieldLabel}>Τίτλος</label>
            <input
              className={styles.titleInput}
              value={c.headline}
              placeholder="Τίτλος άρθρου"
              onChange={(e) => onTitle(e.target.value)}
            />

            <div className={styles.permalink}>
              <Link2 size={12} />
              <span className={styles.permaPrefix}>
                {site ? site.wp : "site"}/
              </span>
              <input
                className={styles.slugInput}
                value={c.slug ?? ""}
                placeholder="slug"
                onChange={(e) => {
                  setSlugTouched(true);
                  updateCell(c.id, { slug: slugify(e.target.value) });
                }}
              />
            </div>

            <label className={styles.fieldLabel}>Κείμενο</label>
            <div className={styles.toolbar}>
              {TOOLS.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  title={t.title}
                  className={styles.tool}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec(t.cmd, t.arg)}
                >
                  <t.icon size={15} />
                </button>
              ))}
              <button
                type="button"
                title="Σύνδεσμος"
                className={styles.tool}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onLink}
              >
                <LinkIcon size={15} />
              </button>
            </div>
            <div
              ref={bodyRef}
              className={styles.content}
              contentEditable
              suppressContentEditableWarning
              onInput={saveBody}
              data-placeholder="Γράψε το άρθρο εδώ…"
            />

            <div className={styles.statsFooter}>
              <span>
                <strong>{words}</strong> Λέξεις
              </span>
              <span>
                {readingMin}′ χρόνος ανάγνωσης
              </span>
            </div>
          </div>

          {/* mobile-only toggle for the panel below the editor */}
          <button
            className={styles.panelToggle}
            onClick={() => setPanelOpen((o) => !o)}
          >
            <span>Άρθρο &amp; SEO</span>
            <ChevronDown
              size={16}
              style={{ transform: panelOpen ? "rotate(180deg)" : "none" }}
            />
          </button>

          {/* right sidebar */}
          <aside
            className={[styles.sidebar, panelOpen ? styles.sidebarOpen : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <Panel pad={14}>
              <Eyebrow icon={Send}>Δημοσίευση</Eyebrow>
              {site ? (
                <>
                  <div className={styles.publishSite}>
                    <SiteTag id={c.site} />
                  </div>
                  <div className={styles.endpoint}>
                    <Link2 size={12} color={site.color} />
                    {site.wp}/wp-json/wp/v2/posts
                  </div>
                  <div className={styles.catLine}>
                    Κατηγορία:{" "}
                    <span style={{ color: site.color }}>
                      {c.category || site.wpCat}
                    </span>
                  </div>
                  {c.wpPostId ? (
                    <div className={styles.published}>
                      <CheckCircle2 size={16} />
                      Δημοσιευμένο · post #{c.wpPostId}
                    </div>
                  ) : (
                    <Button
                      icon={Send}
                      loading={c._publishing}
                      onClick={() => publishWP(c.id)}
                    >
                      Publish to {site.name}
                    </Button>
                  )}
                </>
              ) : (
                <div className={styles.hint}>
                  Ανάθεσε ένα site για δημοσίευση.
                </div>
              )}
            </Panel>

            <Panel pad={14}>
              <Eyebrow>Περίληψη</Eyebrow>
              <textarea
                className={styles.textarea}
                value={excerpt}
                placeholder="Σύντομη περίληψη του άρθρου…"
                onChange={(e) => updateCell(c.id, { excerpt: e.target.value })}
              />
              <div className={styles.counter}>{excerpt.length} χαρακτήρες</div>
            </Panel>

            <Panel pad={14}>
              <Eyebrow icon={ImageIcon}>Κεντρική εικόνα</Eyebrow>
              <input
                className={styles.input}
                value={c.featured ?? ""}
                placeholder="https://… (URL εικόνας)"
                onChange={(e) => updateCell(c.id, { featured: e.target.value })}
              />
              <div className={styles.preview}>
                {c.featured ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.featured}
                    alt="preview"
                    className={styles.previewImg}
                  />
                ) : (
                  <div className={styles.previewEmpty}>
                    <ImageIcon size={20} />
                    Καμία εικόνα
                  </div>
                )}
              </div>
            </Panel>

            <Panel pad={14}>
              <Eyebrow>Κατηγορία</Eyebrow>
              <input
                className={styles.input}
                value={c.category ?? ""}
                placeholder={site?.wpCat ?? "Κατηγορία"}
                onChange={(e) => updateCell(c.id, { category: e.target.value })}
              />
            </Panel>

            <Panel pad={14}>
              <Eyebrow>Ετικέτες</Eyebrow>
              <div className={styles.tags}>
                {(c.tags ?? []).map((t) => (
                  <span
                    key={t}
                    className={styles.tag}
                    onClick={() => removeTag(t)}
                    title="Αφαίρεση"
                  >
                    {t}
                    <X size={11} />
                  </span>
                ))}
              </div>
              <input
                className={styles.input}
                value={tagInput}
                placeholder="Πρόσθεσε ετικέτα + Enter"
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
            </Panel>

            <Panel pad={14}>
              <Eyebrow>SEO</Eyebrow>
              <label className={styles.subLabel}>SEO τίτλος</label>
              <input
                className={styles.input}
                value={seoTitle}
                placeholder="SEO τίτλος"
                onChange={(e) => updateCell(c.id, { seoTitle: e.target.value })}
              />
              <div
                className={styles.counter}
                style={{
                  color:
                    seoTitle.length > 60 ? "var(--amber)" : "var(--faint)",
                }}
              >
                {seoTitle.length}/60 χαρακτήρες
              </div>
              <label className={styles.subLabel}>Meta περιγραφή</label>
              <textarea
                className={styles.textarea}
                value={seoDesc}
                placeholder="Meta περιγραφή (150–160)"
                onChange={(e) => updateCell(c.id, { seoDesc: e.target.value })}
              />
              <div
                className={styles.counter}
                style={{
                  color:
                    seoDesc.length >= 150 && seoDesc.length <= 160
                      ? "var(--green)"
                      : "var(--faint)",
                }}
              >
                {seoDesc.length}/160 χαρακτήρες
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}
