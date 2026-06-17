// Γλωσσάρι — όλοι οι όροι/συντομογραφίες που χρησιμοποιεί το MATRIX, ανά κατηγορία.
// Καθαρά reference data (καμία λογική) — το component απλώς το προβάλλει/φιλτράρει.

export interface GlossaryTerm {
  term: string;
  abbr?: string; // συντομογραφία/σύμβολο αν υπάρχει
  def: string; // ορισμός (ελληνικά)
}

export interface GlossaryGroup {
  title: string;
  terms: GlossaryTerm[];
}

export const GLOSSARY: GlossaryGroup[] = [
  {
    title: "Ροή σύνταξης (Newsroom)",
    terms: [
      { term: "Story Cell", def: "Μονάδα ιστορίας στον πίνακα — από την είδηση/ιδέα μέχρι τη δημοσίευση." },
      { term: "Ingest", def: "Εισαγωγή νέων ειδήσεων από feeds στον πίνακα ως cells." },
      { term: "Auto-Router", def: "Αυτόματη ανάθεση κάθε cell σε portal βάσει keywords & vertical." },
      { term: "Routing confidence", def: "Βεβαιότητα της ανάθεσης σε portal (0–100)." },
      { term: "SLA", abbr: "SLA", def: "Service Level Agreement — χρονικό όριο για breaking πριν τη δημοσίευση." },
      { term: "Breaking", def: "Επείγουσα είδηση με σφιχτό SLA." },
      { term: "Standard", def: "Κανονικής ροής περιεχόμενο." },
      { term: "Evergreen", def: "Διαχρονικό περιεχόμενο χωρίς χρονικό όριο." },
    ],
  },
  {
    title: "Στήλες πίνακα (Kanban)",
    terms: [
      { term: "Ingested", def: "Μόλις μπήκε — δεν έχει ανατεθεί ακόμη σε portal." },
      { term: "Routed", def: "Ανατέθηκε σε portal, έτοιμο για draft." },
      { term: "AI Draft", def: "Δημιουργήθηκε προσχέδιο (τίτλοι/meta/keywords) από AI." },
      { term: "Editor Review", def: "Σε έλεγχο/επιμέλεια από συντάκτη." },
      { term: "Published", def: "Δημοσιεύτηκε στο WordPress." },
      { term: "Promoted", def: "Προωθήθηκε (social/newsletter)." },
    ],
  },
  {
    title: "Agents (πράκτορες)",
    terms: [
      { term: "Agent", def: "Αυτοματοποιημένος βοηθός με προγραμματισμένη εκτέλεση (cron)." },
      { term: "Χθεσινή Αναφορά SEO", def: "Ρετροσπεκτίβα: ελέγχει τα χθεσινά δημοσιευμένα άρθρα και βγάζει μαθήματα." },
      { term: "Social Radar", def: "Μία μηχανή που βρίσκει τάσεις + κενά περιεχομένου και σερβίρει έτοιμες ιδέες." },
      { term: "Trend Radar", def: "Η όψη «τάσεις» (ανερχόμενα θέματα) του Social Radar." },
      { term: "Content Gaps", def: "Ευκαιρίες με πραγματική ζήτηση αλλά αδύναμη/καμία κάλυψη από εμάς." },
      { term: "KPI", abbr: "KPI", def: "Key Performance Indicators — δείκτες απόδοσης (προβολές, άρθρα, SLA)." },
    ],
  },
  {
    title: "SEO & Publish Gate",
    terms: [
      { term: "Publish Gate", def: "Έλεγχος πριν τη δημοσίευση — μπλοκάρει αν λείπουν κρίσιμα SEO στοιχεία." },
      { term: "Critical", def: "Κρίσιμος έλεγχος — αν αποτύχει, μπλοκάρει τη δημοσίευση." },
      { term: "Improve", def: "Έλεγχος βελτίωσης — δεν μπλοκάρει, αλλά συνιστάται." },
      { term: "Meta description", def: "Περιγραφή σελίδας για τα αποτελέσματα αναζήτησης." },
      { term: "SEO title", def: "Ο τίτλος που βλέπει η Google (μπορεί να διαφέρει από τον headline)." },
      { term: "Canonical", def: "Η «επίσημη» διεύθυνση μιας σελίδας — αποτρέπει διπλό περιεχόμενο." },
      { term: "Noindex", def: "Οδηγία να ΜΗΝ καταχωρηθεί η σελίδα στη μηχανή αναζήτησης." },
      { term: "Schema", def: "Δομημένα δεδομένα (structured data) που εξηγούν το περιεχόμενο στη Google." },
      { term: "Featured image", def: "Κύρια εικόνα του άρθρου." },
    ],
  },
  {
    title: "Ιδέες Social Radar",
    terms: [
      { term: "Idea", def: "Έτοιμη πρόταση περιεχομένου: portal, μορφή, ελληνική γωνία και σήμα ζήτησης." },
      { term: "ideaType: trend", def: "Ανερχόμενο θέμα (υψηλή ταχύτητα/ζήτηση τώρα)." },
      { term: "ideaType: gap", def: "Υποκαλυμμένο θέμα (ζήτηση αλλά αδύναμη κάλυψη)." },
      { term: "ideaType: both", def: "Και ανερχόμενο και υποκαλυμμένο — η μεγάλη ευκαιρία." },
      { term: "Format", def: "article (άρθρο) · video (βίντεο) · post (ανάρτηση)." },
      { term: "Demand", def: "Ζήτηση 0–100 — πάντα μετρημένη, ποτέ εφευρημένη." },
      { term: "Demand signal", def: "Η πηγαία απόδειξη της ζήτησης σε φυσική γλώσσα." },
      { term: "Velocity", def: "Ρυθμός ανόδου ενός θέματος (όχι ο απόλυτος όγκος)." },
      { term: "Lifecycle", def: "emerging (αναδύεται) · surging (εκτοξεύεται) · peaking (κορυφώνεται) · fading (υποχωρεί)." },
      { term: "Winnability", def: "Ρεαλιστική πιθανότητα να κατακτήσουμε το θέμα (0–1)." },
      { term: "Relevance", def: "Συνάφεια ιδέας με το προφίλ του portal — ο μοχλός ακρίβειας." },
      { term: "Coverage", def: "Πόσο το καλύπτουμε ήδη: none (καθόλου) · weak (αδύναμα) · covered (πλήρως)." },
      { term: "Striking distance", def: "Ερωτήματα όπου ήδη βρισκόμαστε ~θέση 11–20 στη Google (φθηνή νίκη)." },
      { term: "Cross-media", def: "Ιδέα που ταιριάζει δυνατά σε >1 portal — προσοχή στην επικάλυψη." },
    ],
  },
  {
    title: "Watchlists & precision",
    terms: [
      { term: "Media profile", def: "Το «προφίλ» κάθε portal: τι καλύπτει, τι αξίες έχει, τι αποφεύγει." },
      { term: "Seeds", def: "Οντότητες/θέματα/φράσεις που παρακολουθεί ένα portal — οδηγούν την αναζήτηση." },
      { term: "Avoids", def: "Off-brand όροι — μηδενίζουν τη συνάφεια και αποκλείουν την ανάθεση." },
      { term: "Relevance floor", def: "Ελάχιστη συνάφεια για να ανατεθεί ιδέα σε portal (ρυθμιστής ακρίβειας)." },
      { term: "Quality filter", def: "Πετάει θόρυβο (ξενόγλωσσα, σπασμένα, άσχετα single tokens) πριν τη βαθμολόγηση." },
    ],
  },
  {
    title: "Πηγές δεδομένων",
    terms: [
      { term: "Google Trends", def: "Ανερχόμενα ερωτήματα αναζήτησης (Ελλάδα)." },
      { term: "YouTube", def: "Δημοφιλή βίντεο/Shorts ανά περιοχή." },
      { term: "X / Twitter", def: "Trends & συζητήσεις σε πραγματικό χρόνο." },
      { term: "TikTok", def: "Ανερχόμενα hashtags/βίντεο." },
      { term: "Autocomplete", def: "Προτάσεις Google Suggest — εύρος ζήτησης & ερωτήσεις κόσμου." },
      { term: "GSC", abbr: "GSC", def: "Google Search Console — οι δικές μας εμφανίσεις/θέσεις (μελλοντικό)." },
      { term: "WP REST", abbr: "WP REST", def: "Το API του WordPress — για έλεγχο τι έχουμε ήδη δημοσιεύσει." },
    ],
  },
  {
    title: "Καταστάσεις & δίκτυο",
    terms: [
      { term: "Status (RAG)", abbr: "RAG", def: "green (υγιές) · amber (προσοχή) · red (κρίσιμο)." },
      { term: "Scope", def: "Εύρος προβολής: όλο το δίκτυο ή ένα συγκεκριμένο portal." },
      { term: "Sportal", def: "Αθλητικά (ποδόσφαιρο, μπάσκετ, λίγκες)." },
      { term: "OutsidersBet", def: "Στοίχημα — αποδόσεις, προγνωστικά, value picks." },
      { term: "OnlyAuto", def: "Αυτοκίνητο & μηχανή — δοκιμές, μοντέλα, ηλεκτροκίνηση." },
      { term: "Exodos", def: "Έξοδος — εστιατόρια, μπαρ, συναυλίες, εκδηλώσεις." },
      { term: "Klik", def: "Showbiz & celebrity — τηλεόραση, σειρές, viral." },
      { term: "Muse", def: "Lifestyle — μόδα, ομορφιά, wellness, ταξίδι." },
    ],
  },
];
