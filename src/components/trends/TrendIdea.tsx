"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Plus, Search, Sparkles, X } from "lucide-react";
import { useNewsroom } from "@/lib/store/useNewsroom";
import { useCan } from "@/lib/store/useAuth";
import { SITES } from "@/lib/config/sites";
import { generateTrendIdeas, researchTrend } from "@/lib/services/agents";
import { T } from "@/lib/config/strings";
import Button from "@/components/ui/Button";
import styles from "./TrendIdea.module.css";

// Centered modal (ArticleEditor pattern): pick brand profiles → generate per-brand
// content ideas (Claude via Social Radar) → copy / send-to-drafts.
export default function TrendIdea() {
  const router = useRouter();
  const id = useNewsroom((s) => s.trendIdea);
  const trend = useNewsroom((s) => s.radarTrends.find((t) => t.id === s.trendIdea));
  const close = useNewsroom((s) => s.closeTrendIdea);
  const createCell = useNewsroom((s) => s.createCellFromRadarTrend);
  const createSocialCell = useNewsroom((s) => s.createSocialCell);
  const createArticleCellFromIdea = useNewsroom((s) => s.createArticleCellFromIdea);
  const markTrendUsed = useNewsroom((s) => s.markTrendUsed);
  const flash = useNewsroom((s) => s.flash);
  const can = useCan();
  // AI output is cached in the store (per trend) so it survives page navigation
  // and the user never pays to regenerate after creating a cell.
  const drafts = useNewsroom((s) => (s.trendIdea ? s.trendDrafts[s.trendIdea] : undefined)) ?? [];
  const research = useNewsroom((s) => (s.trendIdea ? s.trendResearch[s.trendIdea] : undefined)) ?? null;
  const storedBrands = useNewsroom((s) => (s.trendIdea ? s.trendBrands[s.trendIdea] : undefined));
  const cacheTrendDrafts = useNewsroom((s) => s.cacheTrendDrafts);
  const cacheTrendResearch = useNewsroom((s) => s.cacheTrendResearch);
  const setTrendBrands = useNewsroom((s) => s.setTrendBrands);

  const [loading, setLoading] = useState(false);
  const [researching, setResearching] = useState(false);

  if (!id || !trend) return null;

  const selected = storedBrands ?? trend.suggestedBrands.map((b) => b.site).slice(0, 2);

  const toggle = (sid: string) =>
    setTrendBrands(
      trend.id,
      selected.includes(sid) ? selected.filter((x) => x !== sid) : [...selected, sid],
    );

  const doResearch = async () => {
    setResearching(true);
    const r = await researchTrend(trend.id);
    setResearching(false);
    if (!r || (!r.whyTrending && !r.summary)) return flash(T.radar.researchFailed);
    cacheTrendResearch(trend.id, r);
  };

  const generate = async () => {
    if (selected.length === 0) return flash(T.radar.pickBrand);
    setLoading(true);
    const res = await generateTrendIdeas(trend.id, selected);
    setLoading(false);
    if (!res) return flash(T.radar.genFailed);
    cacheTrendDrafts(trend.id, res.drafts);
    if (res.research && (res.research.whyTrending || res.research.summary))
      cacheTrendResearch(trend.id, res.research);
  };

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    flash(T.radar.copied);
  };

  // Per-idea "Create cell": route to the matching board, then navigate there.
  // The store create actions set boardKind + open the drawer + close this modal.
  const goSocial = (
    platform: string,
    headline: string,
    caption: string,
    hashtags: string[],
    site: string,
  ) => {
    createSocialCell({ platform, headline, caption, hashtags, site, trendTitle: trend.title });
    markTrendUsed(trend.id);
    router.push("/newsroom");
  };
  const goArticle = (
    article: {
      headline: string;
      outline: string[];
      draft: string;
      seoTitles?: string[];
      meta?: string;
      keywords?: string[];
    },
    site: string,
  ) => {
    // body = outline as H2 sections + the draft paragraph(s)
    const body = `${article.outline
      .map((o) => `<h2>${o}</h2>`)
      .join("")}<p>${article.draft.replace(/\n+/g, "</p><p>")}</p>`;
    // title options (generated alternatives), keywords (generated → else trend
    // entities) so the article cell opens with the full SEO toolkit.
    const titles = article.seoTitles?.length
      ? [article.headline, ...article.seoTitles]
      : [article.headline];
    const keywords = article.keywords?.length
      ? article.keywords
      : trend.entities.map((e) => e.name).filter(Boolean);
    createArticleCellFromIdea({
      headline: article.headline,
      body,
      titles,
      meta: article.meta,
      keywords,
      event: research?.summary || trend.title,
      sourceText: research?.summary || "",
      site,
      trendTitle: trend.title,
    });
    markTrendUsed(trend.id);
    router.push("/newsroom");
  };

  return (
    <div className={styles.backdrop} onClick={close}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.topbar}>
          <span className={styles.scope}>{trend.scope === "global" ? T.radar.global : T.radar.greece}</span>
          <span className={styles.title}>{trend.title}</span>
          <button className={styles.close} onClick={close} aria-label="close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.research}>
            <div className={styles.researchHead}>
              <span className={styles.label}>{T.radar.whyTrending}</span>
              <Button small variant="soft" icon={Search} loading={researching} onClick={() => void doResearch()}>
                {T.radar.research}
              </Button>
            </div>
            {research ? (
              <div className={styles.researchBody}>
                <span className={styles.entityType}>{research.entityType}</span>
                {research.whyTrending && <p className={styles.why}>{research.whyTrending}</p>}
                {research.summary && <p className={styles.summary}>{research.summary}</p>}
                {research.sources.length > 0 && (
                  <div className={styles.sources}>
                    {research.sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noreferrer" className={styles.source}>
                        <ExternalLink size={11} /> {(s.title || s.url).slice(0, 44)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.hint}>{T.radar.researchHint}</div>
            )}
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
            {/* UX gating: generating ideas vs. creating a draft cell */}
            {can("trends.generate") && (
              <Button icon={Sparkles} loading={loading} onClick={() => void generate()}>
                {T.radar.generate}
              </Button>
            )}
            {can("drafts.create") && (
              <Button variant="ghost" icon={Plus} onClick={() => createCell(trend)}>
                {T.radar.sendToDrafts}
              </Button>
            )}
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
                        onClick={() => copy(`${p.hook}\n${p.caption}\n${p.hashtags.map((h) => "#" + h).join(" ")}`)}
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

                  <div className={styles.idea}>
                    <div className={styles.ideaType}>{T.radar.reel}</div>
                    <div className={styles.ideaBody}>
                      <strong>{i.shortVideo.hook}</strong>
                      <div>{i.shortVideo.script}</div>
                    </div>
                    <button
                      className={styles.copyBtn}
                      onClick={() => copy(`${i.shortVideo.hook}\n${i.shortVideo.script}`)}
                      title={T.radar.copy}
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      className={styles.createBtn}
                      onClick={() => goSocial("reel", i.shortVideo.hook, i.shortVideo.script, [], d.profileId)}
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
