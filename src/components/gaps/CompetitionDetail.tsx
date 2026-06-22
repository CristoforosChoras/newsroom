"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Plus, Sparkles, X } from "lucide-react";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { SITES } from "@/lib/config/sites";
import { generateCompetitionAngle } from "@/lib/services/agents";
import { T } from "@/lib/config/strings";
import type { CompetitionDraft } from "@/lib/types";
import Button from "@/components/ui/Button";
import styles from "@/components/trends/TrendIdea.module.css";

// Detail + suggested-angle modal for a competition finding. Mirrors TrendIdea:
// pick brand(s) → generate per-brand ideas → copy / create cell.
export default function CompetitionDetail() {
  const router = useRouter();
  const detail = useNewsroom((s) => s.competitionDetail);
  const finding = useNewsroom((s) =>
    s.competitionDetail
      ? (s.competitionFindings[s.competitionDetail.runId] ?? []).find(
          (f) => f.id === s.competitionDetail!.findingId,
        )
      : undefined,
  );
  const close = useNewsroom((s) => s.closeCompetitionDetail);
  const createSocialCell = useNewsroom((s) => s.createSocialCell);
  const createArticleCellFromIdea = useNewsroom((s) => s.createArticleCellFromIdea);
  const flash = useNewsroom((s) => s.flash);

  const [selected, setSelected] = useState<string[]>(() => finding?.profileFit.slice(0, 2) ?? []);
  const [drafts, setDrafts] = useState<CompetitionDraft[]>([]);
  const [loading, setLoading] = useState(false);

  if (!detail || !finding) return null;

  const toggle = (sid: string) =>
    setSelected((s) => (s.includes(sid) ? s.filter((x) => x !== sid) : [...s, sid]));

  const generate = async () => {
    if (selected.length === 0) return flash(T.competition.pickBrands);
    setLoading(true);
    const res = await generateCompetitionAngle(detail.runId, finding.id, selected);
    setLoading(false);
    if (!res) return flash(T.competition.failed);
    setDrafts(res);
  };

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    flash(T.radar.copied);
  };

  const goSocial = (platform: string, headline: string, caption: string, hashtags: string[], site: string) => {
    createSocialCell({ platform, headline, caption, hashtags, site, trendTitle: finding.headline });
    router.push("/newsroom");
  };
  const goArticle = (
    article: { headline: string; outline: string[]; draft: string; seoTitles?: string[]; meta?: string; keywords?: string[] },
    site: string,
  ) => {
    const body = `${article.outline.map((o) => `<h2>${o}</h2>`).join("")}<p>${article.draft.replace(/\n+/g, "</p><p>")}</p>`;
    createArticleCellFromIdea({
      headline: article.headline,
      body,
      titles: article.seoTitles?.length ? [article.headline, ...article.seoTitles] : [article.headline],
      meta: article.meta,
      keywords: article.keywords,
      event: finding.whyItMatters,
      site,
      trendTitle: finding.headline,
    });
    router.push("/newsroom");
  };

  return (
    <div className={styles.backdrop} onClick={close}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.topbar}>
          <span className={styles.scope}>
            {finding.type === "missed" ? T.competition.missed : T.competition.behind}
          </span>
          <span className={styles.title}>{finding.headline}</span>
          <button className={styles.close} onClick={close} aria-label="close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.research}>
            <span className={styles.label}>{T.competition.whyMatters}</span>
            <p className={styles.summary}>{finding.whyItMatters}</p>
            <span className={styles.label}>{T.competition.competitorsLabel}</span>
            <div className={styles.sources}>
              {finding.competitors.map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noreferrer" className={styles.source}>
                  <ExternalLink size={11} /> {(c.title || c.url).slice(0, 44)}
                </a>
              ))}
            </div>
          </div>

          <div className={styles.label}>{T.radar.pickBrands}</div>
          <div className={styles.brandRow}>
            {SITES.map((s) => {
              const on = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={styles.brandChip}
                  style={{
                    color: on ? "#0a0a0b" : s.color,
                    background: on ? s.color : "transparent",
                    borderColor: `${s.color}66`,
                  }}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
          <div className={styles.actions}>
            <Button icon={Sparkles} loading={loading} onClick={() => void generate()}>
              {T.competition.generate}
            </Button>
          </div>

          <div className={styles.results}>
            {drafts.length === 0 && <div className={styles.hint}>{T.radar.genHint}</div>}
            {drafts.map((d) => {
              const brand = SITES.find((s) => s.id === d.profileId);
              const i = d.ideas;
              return (
                <div key={d.id} className={styles.draft}>
                  <div className={styles.draftHead} style={{ color: brand?.color }}>
                    {brand?.name ?? d.profileId}
                  </div>
                  {i.socialPosts.map((p, idx) => (
                    <div key={idx} className={styles.idea}>
                      <div className={styles.ideaType}>{p.platform}</div>
                      <div className={styles.ideaBody}>
                        <strong>{p.hook}</strong>
                        <div>{p.caption}</div>
                        <div className={styles.tags}>{p.hashtags.map((h) => `#${h}`).join(" ")}</div>
                      </div>
                      <button
                        className={styles.copyBtn}
                        onClick={() => copy(`${p.hook}\n${p.caption}`)}
                        title={T.radar.copy}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        className={styles.createBtn}
                        onClick={() => goSocial(p.platform, p.hook, p.caption, p.hashtags, d.profileId)}
                        title={T.radar.createCell}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  ))}
                  <div className={styles.idea}>
                    <div className={styles.ideaType}>{T.radar.article}</div>
                    <div className={styles.ideaBody}>
                      <strong>{i.article.headline}</strong>
                      <ul className={styles.outline}>
                        {i.article.outline.map((o, k) => (
                          <li key={k}>{o}</li>
                        ))}
                      </ul>
                      <div>{i.article.draft}</div>
                    </div>
                    <button
                      className={styles.copyBtn}
                      onClick={() => copy(`${i.article.headline}\n\n${i.article.draft}`)}
                      title={T.radar.copy}
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      className={styles.createBtn}
                      onClick={() => goArticle(i.article, d.profileId)}
                      title={T.radar.createCell}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
