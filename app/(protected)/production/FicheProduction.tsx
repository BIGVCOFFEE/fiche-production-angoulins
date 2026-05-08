"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

const TRANCHES_PAR_SACHET = 18;

type Produit = {
  id: number;
  nom: string;
  couleur: string | null;
  conserveExtra: number | null;
  tranchesParUnite: number;
  estPain: boolean;
  cibleAujourdhui: number;
  cibleDemain: number;
  stockVeille: number;
  aProduire: number;
  bufferDemain: number;
};

type Categorie = {
  id: number;
  nom: string;
  emoji: string | null;
  ordre: number;
  estPain: boolean;
  produits: Produit[];
};

type Props = {
  date: string;
  demain: string;
  typeJour: string;
  veille: string;
  categories: Categorie[];
  veilleEstCloturee: boolean;
  estFerme: boolean;
  demainEstFerme: boolean;
  ratio: number;
  openSundays: string[];
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(date + "T12:00:00"));
}

function formatDateCourt(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "short",
  }).format(new Date(date + "T12:00:00"));
}

export default function FicheProduction({
  date, demain, typeJour, veille, categories,
  veilleEstCloturee, estFerme, demainEstFerme, ratio, openSundays,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [masquerCibleZero, setMasquerCibleZero] = useState(true);

  const changeDate = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    if (d.getDay() === 0 && !openSundays.includes(d.toISOString().slice(0, 10))) {
      d.setDate(d.getDate() + delta);
    }
    router.push(`${pathname}?date=${d.toISOString().slice(0, 10)}`);
  };

  const categoriesFiltrees = categories
    .map((cat) => ({
      ...cat,
      produits: masquerCibleZero
        ? cat.produits.filter((p) => p.cibleAujourdhui > 0 || p.stockVeille > 0)
        : cat.produits,
    }))
    .filter((cat) => cat.produits.length > 0);

  const allProduits = categoriesFiltrees.flatMap((c) => c.produits);
  const totalAProduire = allProduits.reduce((s, p) => s + p.aProduire, 0);
  const nbMasques = categories.reduce(
    (s, c) => s + c.produits.filter((p) => p.cibleAujourdhui === 0 && p.stockVeille === 0).length, 0
  );
  const typeJourLabel = typeJour === "sam" ? "Samedi" : typeJour === "dim" ? "Dimanche" : "Semaine";

  // Sachets
  const totalTranches = allProduits.reduce((s, p) => s + p.aProduire * p.tranchesParUnite, 0);
  const totalSachets = Math.ceil(totalTranches / TRANCHES_PAR_SACHET);

  // Totaux par catégorie pain (style BIG V)
  const painTotals = categoriesFiltrees
    .filter((cat) => cat.estPain)
    .map((cat) => ({
      key: `cat-${cat.id}`,
      label: cat.nom,
      emoji: cat.emoji,
      total: cat.produits.reduce((s, p) => s + p.aProduire, 0),
    }))
    .filter((pt) => pt.total > 0);

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 6mm 8mm; }
        @media print {
          body { background: white !important; color: black !important; font-size: 8pt !important; }
          .no-print { display: none !important; }
          .print-outer { display: block !important; height: auto !important; overflow: visible !important; }
          .print-container { padding: 0 !important; overflow: visible !important; height: auto !important; flex: none !important; }
          h1 { font-size: 12pt !important; margin-bottom: 1mm !important; }
          p { font-size: 7.5pt !important; margin: 0 !important; }
          .print-cat-header { padding: 2px 6px !important; margin-bottom: 1px !important; }
          .print-col-header { padding: 1px 4px !important; margin-bottom: 1px !important; }
          .print-row { padding: 1px 4px !important; min-height: 0 !important; }
          .print-row span { font-size: 8pt !important; }
          .print-row .a-produire-big { font-size: 10pt !important; }
          .print-row .buffer-sub { font-size: 6pt !important; }
          .print-section-gap { margin-bottom: 6px !important; }
          .print-recap { margin-top: 6px !important; padding-top: 4px !important; }
          .print-recap-cols { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 6px !important; }
          .page-break-avoid { page-break-inside: avoid; }
        }
        @media (max-width: 640px) {
          .toolbar-wrap  { padding: 10px 12px !important; gap: 8px !important; }
          .toolbar-btn   { min-height: 44px !important; padding: 8px 12px !important; font-size: 14px !important; }
          .date-display  { min-width: 0 !important; font-size: 12px !important; }
          .content-area  { padding: 10px 12px !important; }
          .products-grid { grid-template-columns: 1fr 44px 44px 60px !important; gap: 4px !important; padding: 5px 4px !important; }
          .footer-bar    { gap: 10px !important; padding: 10px 12px !important; flex-wrap: wrap !important; }
        }
      `}</style>

      <div className="print-outer" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Toolbar — masqué à l'impression */}
        <div
          className="no-print toolbar-wrap"
          style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-elev)", flexShrink: 0, flexWrap: "wrap" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button onClick={() => changeDate(-1)} className="toolbar-btn" style={btnStyle}>‹</button>
            <span className="date-display" style={{ fontSize: "13px", fontWeight: 500, padding: "4px 12px", background: "var(--bg-elev-2)", borderRadius: "6px", textTransform: "capitalize", minWidth: "180px", textAlign: "center", color: "var(--text)", border: "1px solid var(--border)" }}>
              {formatDate(date)}
            </span>
            <button onClick={() => changeDate(1)} className="toolbar-btn" style={btnStyle}>›</button>
          </div>

          <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "4px", background: "var(--bg-elev-2)", color: "var(--text)", letterSpacing: "0.05em", border: "1px solid var(--border)" }}>
            {typeJourLabel}
          </span>

          <button
            onClick={() => setMasquerCibleZero((v) => !v)}
            className="toolbar-btn"
            style={{ ...btnStyle, background: masquerCibleZero ? "var(--bg-elev-2)" : "var(--accent)", color: masquerCibleZero ? "var(--text)" : "white", fontSize: "12px" }}
          >
            {masquerCibleZero ? `+ ${nbMasques} masqués` : "Masquer cible 0"}
          </button>

          <div style={{ flex: 1 }} />

          {!veilleEstCloturee && (
            <span style={{ fontSize: "12px", color: "var(--orange)", padding: "4px 10px", background: "var(--orange-soft)", borderRadius: "6px" }}>
              ⚠ Saisie du {formatDateCourt(veille)} non clôturée
            </span>
          )}

          <button
            onClick={() => window.print()}
            className="toolbar-btn"
            style={{ ...btnStyle, background: "var(--accent)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}
          >
            🖨 Imprimer
          </button>
        </div>

        {/* Contenu */}
        <div className="print-container content-area" style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          {estFerme && (
            <div className="no-print" style={{ padding: "10px 16px", marginBottom: "16px", background: "var(--red-soft)", border: "1px solid var(--red)", borderRadius: "8px", fontSize: "13px", color: "var(--red)", fontWeight: 600 }}>
              🔒 Journée marquée comme fermée — aucune production prévue.
            </div>
          )}

          {/* En-tête d'impression */}
          <div style={{ marginBottom: "16px", paddingBottom: "10px", borderBottom: "2px solid var(--border)", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)", margin: 0, textTransform: "capitalize" }}>
                Fiche de production — Angoulins
              </h1>
              <p style={{ fontSize: "13px", color: "var(--text-dim)", margin: "4px 0 0", textTransform: "capitalize" }}>
                {formatDate(date)} · {typeJourLabel}
                {!demainEstFerme && ` · +${ratio}% buffer ${formatDateCourt(demain)}`}
              </p>
            </div>
            <div className="no-print" style={{ textAlign: "right", fontSize: "12px", color: "var(--text-dim)" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)" }}>
                Total : {totalAProduire}
              </div>
            </div>
          </div>

          {/* Catégories */}
          {categoriesFiltrees.map((cat) => {
            const catTotal = cat.produits.reduce((s, p) => s + p.aProduire, 0);
            return (
              <div key={cat.id} className="print-section-gap page-break-avoid" style={{ marginBottom: "18px" }}>
                <div className="print-cat-header" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px", background: "var(--bg-elev-2)", borderRadius: "6px", marginBottom: "3px" }}>
                  {cat.emoji && <span style={{ fontSize: "14px" }}>{cat.emoji}</span>}
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", flex: 1 }}>
                    {cat.nom}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: catTotal > 0 ? "var(--accent)" : "var(--text-dim)" }}>
                    {catTotal} à produire
                  </span>
                </div>

                <div className="products-grid print-grid print-col-header" style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 76px", gap: "8px", padding: "3px 8px", marginBottom: "1px" }}>
                  <span style={headerStyle}>Produit</span>
                  <span style={{ ...headerStyle, textAlign: "center" }}>Stock J-1</span>
                  <span style={{ ...headerStyle, textAlign: "center" }}>Cible</span>
                  <span style={{ ...headerStyle, textAlign: "right" }}>À produire</span>
                </div>

                {cat.produits.map((p) => (
                  <div
                    key={p.id}
                    className="products-grid print-grid print-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 60px 60px 76px",
                      gap: "8px",
                      alignItems: "center",
                      padding: "4px 8px",
                      borderRadius: "3px",
                      borderBottom: "1px solid var(--border)",
                      borderLeft: p.conserveExtra && p.conserveExtra > 0
                        ? "3px solid var(--orange)"
                        : p.aProduire === 0 ? "3px solid var(--green)"
                        : p.couleur ? `3px solid ${p.couleur}` : undefined,
                      background: p.conserveExtra && p.conserveExtra > 0
                        ? "rgba(245,158,11,0.08)"
                        : p.aProduire === 0 ? "var(--green-soft)"
                        : p.couleur ? `${p.couleur}14` : "transparent",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                      {p.nom}
                      {p.conserveExtra && p.conserveExtra > 0 && (
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--orange)", background: "var(--orange-soft)", padding: "1px 5px", borderRadius: "3px", flexShrink: 0 }}>
                          ⚡ +{p.conserveExtra}
                        </span>
                      )}
                    </span>

                    <span style={{ fontSize: "13px", textAlign: "center", color: p.stockVeille > 0 ? "var(--orange)" : "var(--text-faint)", fontWeight: p.stockVeille > 0 ? 600 : 400 }}>
                      {p.stockVeille || "—"}
                    </span>

                    <span style={{ fontSize: "13px", textAlign: "center", color: "var(--text-dim)" }}>
                      {p.cibleAujourdhui || "—"}
                    </span>

                    <div style={{ textAlign: "right" }}>
                      {p.aProduire === 0 ? (
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--green)", background: "var(--green-soft)", padding: "2px 6px", borderRadius: "4px" }}>✓</span>
                      ) : (
                        <div>
                          <span className="a-produire-big" style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)" }}>{p.aProduire}</span>
                          {p.bufferDemain > 0 && (
                            <div className="buffer-sub" style={{ fontSize: "9px", color: "var(--text-dim)", lineHeight: 1.2 }}>+{p.bufferDemain} buffer</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {categoriesFiltrees.length === 0 && (
            <div className="no-print" style={{ padding: "48px", textAlign: "center", color: "var(--text-dim)", fontSize: "14px" }}>
              Aucun produit à afficher pour cette date.
            </div>
          )}

          {/* Récapitulatif sachets + pains */}
          {totalSachets > 0 && (
            <div className="print-sachet-row page-break-avoid" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", margin: "12px 0 4px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-elev-2)" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>🥪 Besoin en sachet clubs</span>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent)" }}>
                {totalSachets} sachet{totalSachets > 1 ? "s" : ""}
              </span>
            </div>
          )}
          {painTotals.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-elev)", fontSize: "12px" }}>
              {painTotals.map((pt) => (
                <span key={pt.key} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "4px", background: "var(--accent-soft)", color: "var(--text)", border: "1px solid var(--border)" }}>
                  {pt.emoji && <span>{pt.emoji}</span>}
                  <span>{pt.label}</span>
                  <strong style={{ color: "var(--accent)" }}>{pt.total}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="no-print footer-bar"
          style={{ display: "flex", alignItems: "center", gap: "24px", padding: "10px 20px", borderTop: "1px solid var(--border)", background: "var(--bg-elev)", flexShrink: 0, fontSize: "12px", color: "var(--text-dim)" }}
        >
          <span style={{ textTransform: "capitalize" }}>{formatDate(date)}</span>
          {!demainEstFerme && (
            <span>Buffer demain : <strong style={{ color: "var(--text)" }}>+{ratio}%</strong></span>
          )}
          <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: "13px" }}>
            Total à produire : {totalAProduire}
          </span>
          {totalSachets > 0 && (
            <span>{totalSachets} sachet{totalSachets > 1 ? "s" : ""} pain de mie</span>
          )}
        </div>
      </div>
    </>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  background: "var(--bg-elev-2)",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: "13px",
};

const headerStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "var(--text-dim)",
};
