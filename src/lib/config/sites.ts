import type { Site, Vertical, ColumnId } from "@/lib/types";

/**
 * The real OnlyGroup network (6 portals, per the sportal.gr footer):
 *   - sportal      = general sports news (football / basketball / leagues)
 *   - outsidersbet = betting / odds / προγνωστικά
 *   - onlyauto     = cars / automotive
 *   - exodos       = going-out / dining / nightlife
 *   - klik         = showbiz / celebrity / TV / viral
 *   - muse         = lifestyle / beauty / fashion
 * Per-site `kw` drives the FE keyword router; the richer watchlists (seeds/values/
 * avoids/relevanceFloor) live in the Social Radar service (config/sites.ts).
 */

export const VERTICALS: Record<Vertical, string> = {
  sports: "Αθλητικά",
  betting: "Στοίχημα",
  auto: "Αυτοκίνητο",
  entertainment: "Ψυχαγωγία",
  lifestyle: "Lifestyle",
};

export const SITES: Site[] = [
  {
    id: "sportal",
    name: "Sportal",
    vertical: "sports",
    color: "#E5534B",
    wp: "sportal.gr",
    wpCat: "Αθλητικά",
    seoKey: "sportal.gr",
    kw: [
      "ποδόσφαιρο",
      "μπάσκετ",
      "super league",
      "euroleague",
      "ομάδα",
      "αγώνας",
      "μεταγραφή",
      "πρωτάθλημα",
      "nba",
      "ντέρμπι",
      "γκολ",
      "προπονητής",
      "τραυματισμός",
    ],
  },
  {
    id: "outsidersbet",
    name: "OutsidersBet",
    vertical: "betting",
    color: "#16A34A",
    wp: "outsidersbet.gr",
    wpCat: "Στοίχημα",
    seoKey: "outsidersbet.gr",
    kw: [
      "στοίχημα",
      "προγνωστικά",
      "αποδόσεις",
      "betting",
      "odds",
      "παρολί",
      "κουπόνι",
      "στοιχηματική",
      "live betting",
      "value bet",
      "μονό",
    ],
  },
  {
    id: "klik",
    name: "Klik",
    vertical: "entertainment",
    color: "#F59E0B",
    wp: "klik.gr",
    wpCat: "Showbiz",
    seoKey: "klik.gr",
    kw: [
      "celebrity",
      "showbiz",
      "τηλεόραση",
      "σειρά",
      "reality",
      "gossip",
      "viral",
      "τραγουδιστής",
      "ηθοποιός",
      "γάμος",
      "χωρισμός",
      "παρουσιάστρια",
    ],
  },
  {
    id: "onlyauto",
    name: "OnlyAuto",
    vertical: "auto",
    color: "#3B82F6",
    wp: "onlyauto.gr",
    wpCat: "Αυτοκίνητο",
    seoKey: "onlyauto.gr",
    kw: [
      "αυτοκίνητο",
      "μοντέλο",
      "suv",
      "ηλεκτρικό",
      "test drive",
      "κινητήρας",
      "ev",
      "μοτοσικλέτα",
      "πωλήσεις",
      "ίπποι",
      "αυτοκινήτων",
    ],
  },
  {
    id: "exodos",
    name: "Exodos",
    vertical: "entertainment",
    color: "#A855F7",
    wp: "exodos.com.gr",
    wpCat: "Έξοδος",
    seoKey: "exodos.com.gr",
    kw: [
      "έξοδος",
      "εστιατόριο",
      "bar",
      "συναυλία",
      "νυχτερινή",
      "εκδήλωση",
      "gourmet",
      "ποτό",
      "φεστιβάλ",
      "weekend",
      "διήμερο",
      "προορισμ",
    ],
  },
  {
    id: "muse",
    name: "Muse",
    vertical: "lifestyle",
    color: "#EC4899",
    wp: "muse.gr",
    wpCat: "Lifestyle",
    kw: [
      "μόδα",
      "ομορφιά",
      "τάση",
      "celebrity",
      "wellness",
      "ταξίδι",
      "lifestyle",
      "beauty",
      "style",
      "φοριέται",
      "skincare",
    ],
  },
];

export const siteById = (id: string | null | undefined): Site | undefined =>
  SITES.find((s) => s.id === id);

// Reverse lookup: n8n `site` key / domain (e.g. "sportal.gr") → Site (FE id).
export const siteBySeoKey = (key: string | null | undefined): Site | undefined =>
  SITES.find((s) => s.seoKey === key);

export const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "assigned", label: "Ανατέθηκε" },
  { id: "ai_draft", label: "AI Draft" },
  { id: "review", label: "Review" },
  { id: "published", label: "Published" },
];
