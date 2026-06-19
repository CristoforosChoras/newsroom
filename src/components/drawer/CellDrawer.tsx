"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  Globe,
  Link2,
  Search,
  Send,
  Shuffle,
  Sparkles,
  Tag as TagIcon,
  UserPlus,
  Undo2,
  X,
} from "lucide-react";
import { COLUMNS, SITES } from "@/lib/config/sites";
import { useNewsroom } from "@/lib/store/useNewsroom";
import {
  userById,
  writersForSite,
  editorsForSite,
} from "@/lib/config/team";
import { evaluateGate } from "@/lib/services/seoGate";
import { timeHM } from "@/lib/utils/time";
import { T } from "@/lib/config/strings";
import Button from "@/components/ui/Button";
import Eyebrow from "@/components/ui/Eyebrow";
import SiteTag from "@/components/ui/SiteTag";
import StatusLight from "@/components/ui/StatusLight";
import styles from "./CellDrawer.module.css";

export default function CellDrawer() {
  const open = useNewsroom((s) => s.open);
  const cell = useNewsroom((s) => s.cells.find((c) => c.id === open));
  const closeCell = useNewsroom((s) => s.closeCell);
  const updateCell = useNewsroom((s) => s.updateCell);
  const reroute = useNewsroom((s) => s.reroute);
  const move = useNewsroom((s) => s.move);
  const openEditor = useNewsroom((s) => s.openEditor);
  const currentUser = useNewsroom((s) => s.currentUser);
  const assign = useNewsroom((s) => s.assign);
  const generateDraft = useNewsroom((s) => s.generateDraft);
  const submitForReview = useNewsroom((s) => s.submitForReview);
  const sendBack = useNewsroom((s) => s.sendBack);
  const approveAndPublish = useNewsroom((s) => s.approveAndPublish);
  const reassign = useNewsroom((s) => s.reassign);
  const [note, setNote] = useState("");

  if (!cell) return null;
  const c = cell;
  const gate = evaluateGate(c);
  const criticals = gate.blockers.filter((b) => b.severity === "critical");
  const blocked = criticals.length > 0;

  const me = userById(currentUser);
  const isLead = me?.role === "lead";
  const isAssignee = currentUser === c.assignee || isLead;
  const isReviewer = currentUser === c.reviewer || isLead;
  const writers = writersForSite(c.site);
  const editors = editorsForSite(c.site).filter((e) => e.id !== c.assignee);

  return (
    <div className={styles.backdrop} onClick={closeCell}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <SiteTag id={c.site} />
          {c.urgency === "breaking" && (
            <span className={styles.breaking}>{T.card.breaking}</span>
          )}
          <X
            size={20}
            color="var(--dim)"
            className={styles.close}
            onClick={closeCell}
          />
        </div>

        <input
          className={styles.headline}
          value={c.headline}
          onChange={(e) => updateCell(c.id, { headline: e.target.value })}
        />
        <div className={styles.meta}>
          {c.source} · {timeHM(c.createdAt)}
        </div>

        {/* source / original (wire ingestion: ΑΠΕ-ΜΠΕ etc.) */}
        {(c.originalUrl || c.sourceText) && (
          <div className={styles.sourceBlock}>
            <Eyebrow icon={Link2}>{T.drawer.sourceTitle}</Eyebrow>
            <div className={styles.sourceRow}>
              <span className={styles.sourceBadge}>{c.source}</span>
              {c.originalUrl && (
                <a
                  href={c.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.sourceLink}
                >
                  {T.drawer.openOriginal}
                </a>
              )}
            </div>
            {c.sourceText && (
              <details className={styles.sourceDetails}>
                <summary className={styles.sourceSummary}>
                  {T.drawer.originalSummary}
                </summary>
                <div className={styles.sourceText}>{c.sourceText}</div>
              </details>
            )}
          </div>
        )}

        {/* ── stage actions (role-aware) ── */}
        <div className={styles.section}>
          <Eyebrow icon={ArrowRight}>
            {T.drawer.flow(
              COLUMNS.find((col) => col.id === c.status)?.label ?? "",
            )}
          </Eyebrow>

          {c.status === "inbox" && (
            <div className={styles.stageActions}>
              <Button icon={UserPlus} onClick={() => assign(c.id)}>
                {T.drawer.autoAssign}
              </Button>
              {writers.length > 0 && (
                <select
                  className={styles.picker}
                  value=""
                  onChange={(e) => e.target.value && assign(c.id, e.target.value)}
                >
                  <option value="">{T.drawer.pickWriter}</option>
                  {writers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {c.status === "assigned" && (
            <div className={styles.stageActions}>
              <div className={styles.owner}>
                {T.drawer.writer("")}
                <strong>{userById(c.assignee)?.name ?? "—"}</strong>
              </div>
              {isAssignee ? (
                <Button
                  icon={Sparkles}
                  loading={c._drafting}
                  onClick={() => void generateDraft(c.id)}
                >
                  {T.drawer.openDraft}
                </Button>
              ) : (
                <div className={styles.hintAmber}>
                  {T.drawer.belongsTo(userById(c.assignee)?.name ?? "")}
                </div>
              )}
              {isLead && writers.length > 0 && (
                <select
                  className={styles.picker}
                  value=""
                  onChange={(e) =>
                    e.target.value && reassign(c.id, e.target.value)
                  }
                >
                  <option value="">{T.drawer.reassign}</option>
                  {writers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {c.status === "ai_draft" && (
            <div className={styles.stageActions}>
              <div className={styles.owner}>
                Συντάκτης: <strong>{userById(c.assignee)?.name ?? "—"}</strong>
                {" · v"}
                {c.aiVersion}
              </div>
              {c.editorNotes.length > 0 && (
                <div className={styles.notes}>
                  <div className={styles.notesTitle}>↩ Σχόλια επιμελητή</div>
                  {c.editorNotes.map((n, i) => (
                    <div key={i} className={styles.noteRow}>
                      {userById(n.by)?.name ?? n.by}: {n.text}
                    </div>
                  ))}
                </div>
              )}
              {isAssignee ? (
                <>
                  <Button
                    icon={FileText}
                    variant="soft"
                    onClick={() => openEditor(c.id)}
                  >
                    Επεξεργασία άρθρου
                  </Button>
                  {editors.length > 0 ? (
                    <Button icon={Send} onClick={() => submitForReview(c.id)}>
                      Υποβολή για review
                    </Button>
                  ) : (
                    <div className={styles.hintAmber}>
                      Δεν υπάρχει διαθέσιμος επιμελητής (≠ συντάκτη).
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.hintAmber}>
                  Μόνο ο/η {userById(c.assignee)?.name ?? "συντάκτης"} επεξεργάζεται & υποβάλλει.
                </div>
              )}
            </div>
          )}

          {c.status === "review" && (
            <div className={styles.stageActions}>
              <div className={styles.owner}>
                Επιμελητής: <strong>{userById(c.reviewer)?.name ?? "—"}</strong>
                {" · συντάκτης: "}
                {userById(c.assignee)?.name ?? "—"}
              </div>
              <div className={styles.gate}>
                <div className={styles.gateTitle}>
                  SEO gate{blocked ? " · φραγή δημοσίευσης" : " · OK"}
                </div>
                {gate.blockers.map((b) => (
                  <div key={b.id} className={styles.gateRow}>
                    <StatusLight s={b.severity === "critical" ? "red" : "amber"} />
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
              {isReviewer ? (
                <>
                  <Button
                    icon={CheckCircle2}
                    disabled={blocked}
                    loading={c._publishing}
                    onClick={() => approveAndPublish(c.id)}
                  >
                    {blocked ? "Φραγή: κρίσιμο SEO" : "Έγκριση & Δημοσίευση"}
                  </Button>
                  <textarea
                    className={styles.noteInput}
                    placeholder="Σχόλιο για επιστροφή στον συντάκτη…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button
                    icon={Undo2}
                    variant="ghost"
                    onClick={() => {
                      sendBack(c.id, note);
                      setNote("");
                    }}
                  >
                    Επιστροφή με σχόλια
                  </Button>
                </>
              ) : (
                <div className={styles.hintAmber}>
                  Μόνο ο/η επιμελητής/τρια ({userById(c.reviewer)?.name ?? "—"})
                  εγκρίνει ή επιστρέφει.
                </div>
              )}
            </div>
          )}

          {c.status === "published" && (
            <div className={styles.stageActions}>
              <div className={styles.published}>
                <CheckCircle2 size={16} /> Δημοσιευμένο
                {c.wpPostId ? ` · post #${c.wpPostId}` : ""}
              </div>
              {c.promo && (
                <div className={styles.promo}>
                  Promo: social {c.promo.social ? "✓" : "—"} · newsletter{" "}
                  {c.promo.newsletter ? "✓" : "—"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* routing */}
        <div className={styles.routing}>
          <div className={styles.routingHead}>
            <Shuffle size={14} color="var(--orange)" />
            <span className={styles.routingTitle}>Routing</span>
            {c.confidence != null && (
              <span className={styles.confidence}>
                {c.confidence}% confidence
              </span>
            )}
          </div>
          <div className={styles.chips}>
            {SITES.map((site) => {
              const selected = c.site === site.id;
              return (
                <span
                  key={site.id}
                  onClick={() => updateCell(c.id, { site: site.id })}
                  className={styles.chip}
                  style={{
                    color: selected ? "#0a0a0b" : site.color,
                    background: selected ? site.color : "transparent",
                    borderColor: `${site.color}66`,
                  }}
                >
                  {site.name}
                </span>
              );
            })}
          </div>
          {c.routeReason && (
            <div className={styles.reason}>{c.routeReason}</div>
          )}
          <Button
            small
            variant="ghost"
            icon={Shuffle}
            loading={c._routing}
            onClick={() => reroute(c.id)}
          >
            Re-route with AI
          </Button>
        </div>

        <Eyebrow icon={Globe}>Event</Eyebrow>
        <textarea
          className={styles.textarea}
          value={c.event}
          placeholder="Περιγραφή του γεγονότος…"
          onChange={(e) => updateCell(c.id, { event: e.target.value })}
        />


        <div className={styles.editArticle}>
          <Button
            icon={FileText}
            variant="ghost"
            onClick={() => openEditor(c.id)}
            disabled={!c.site}
          >
            Επεξεργασία άρθρου
          </Button>
        </div>

        {c.titles.length > 0 && (
          <div className={styles.draft}>
            <Eyebrow icon={FileText}>AI τίτλοι (επίλεξε)</Eyebrow>
            {c.titles.map((t, i) => {
              const selected = c.headline === t;
              return (
                <div
                  key={i}
                  onClick={() => updateCell(c.id, { headline: t })}
                  className={[styles.titleOpt, selected ? styles.titleSel : ""]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {selected ? (
                    <CheckCircle2
                      size={15}
                      color="var(--orange)"
                      className={styles.titleIcon}
                    />
                  ) : (
                    <Circle
                      size={15}
                      color="var(--faint)"
                      className={styles.titleIcon}
                    />
                  )}
                  {t}
                </div>
              );
            })}

            <Eyebrow icon={Search}>Meta description</Eyebrow>
            <div className={styles.metaBox}>{c.meta}</div>
            <div className={styles.charCount}>{c.meta.length} χαρακτήρες</div>

            <Eyebrow icon={TagIcon}>LSI keywords</Eyebrow>
            <div className={styles.keywords}>
              {c.keywords.map((k, i) => (
                <span key={i} className={styles.keyword}>
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}


        {/* stage */}
        <div className={styles.section}>
          <Eyebrow icon={ArrowRight}>Στάδιο</Eyebrow>
          <div className={styles.stages}>
            {COLUMNS.map((col) => {
              const selected = c.status === col.id;
              return (
                <span
                  key={col.id}
                  onClick={() => move(c.id, col.id)}
                  className={[styles.stage, selected ? styles.stageSel : ""]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {col.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
