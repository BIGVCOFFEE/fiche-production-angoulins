"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { setRatioLendemain } from "./actions";
import { toast } from "sonner";

type Produit = {
  id: number;
  nom: string;
  couleur: string | null;
  conserveExtra: number | null;
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
  veilleEstCloturee, estFerme, demainEstFerme, ratio: initialRatio,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [masquerCibleZero, setMasquerCibleZero] = useState(true);
  const [ratio, setRatio] = useState(initialRatio);
  const [isPending, startTransition] = useTransition();

  const changeDate = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    router.push(`${pathname}?date=${d.toISOString().slice(0, 10)}`);
  };

  const changeRatio = (newRatio: number) => {
    const val = Math.max(0, Math.min(100, newRatio));
    setRatio(val);
    startTransition(async () => {
      try {
        await setRatioLendemain(val);
      } catch {
        toast.error("Erreur lors de la sauvegarde du ratio");
      }
    });
  };

  const categoriesFiltrees = categories
    .map((cat) => ({
      ...cat,
      produits: masquerCibleZero
        ? cat.produits.filter((p) => p.cibleAujourdhui > 0 || p.stockVeille > 0)
        : cat.produits,
    }))
    .filter((cat) => cat.produits.length > 0);

  const totalAProduire = categoriesFiltrees.reduce(
    (s, c) => s + c.produits.reduce((ss, p) => ss + p.aProduire, 0), 0
  );
  const nbMasques = categories.reduce(
    (s, c) => s + c.produits.filter((p) => p.cibleAujourdhui === 0 && p.stockVeille === 0).length, 0
  );
  const typeJourLabel = typeJour === "sam" ? "Samedi" : typeJour === "dim" ? "Dimanche" : "Semaine";

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-outer { display: block !important; height: auto !important; overflow: visible !important; }
          .print-container { padding: 8mm 12mm !important; overflow: visible !important; height: auto !important; flex: none !important; }
          .print-grid { font-size: 9pt !important; }
          .print-row { padding: 2px 6px !important; }
          h1 { font-size: 14pt !important; margin-bottom: 2mm !important; }
          p { font-size: 9pt !important; margin: 0 !important; }
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
        {/* Toolbar */}
        <div
          className="no-print toolbar-wrap"
          style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-elev)", flexShrink: 0, flexWrap: "wrap" }}
        >
          {/* Date nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button onClick={() => changeDate(-1)} className="toolbar-btn" style={btnStyle}>‹</button>
            <span className="date-display" style={{ fontSize: "13px", fontWeight: 500, padding: "4px 12px", background: "var(--bg-elev-2)", borderRadius: "6px", textTransform: "capitalize", minWidth: "180px", textAlign: "center", color: "var(--text)", border: "1px solid var(--border)" }}>
              {formatDate(date)}
            </span>
            <button onClick={() => changeDate(1)} className="toolbar-btn" style={btnStyle}>›</button>
          </div>

          {/* Type jour */}
          <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "4px", background: "var(--bg-elev-2)", color: "var(--text)", letterSpacing: "0.05em", border: "1px solid var(--border)" }}>
            {typeJourLabel}
          </span>

          {/* Ratio lendemain */}
          {!demainEstFerme && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 500 }}>+% demain :</span>
              <button
                onClick={() => changeRatio(ratio - 5)}
                disabled={isPending}
                className="toolbar-btn"
                style={{ ...btnStyle, padding: "4px 8px", fontSize: "14px" }}
              >−</button>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)", minWidth: "36px", textAlign: "center", padding: "4px 6px", background: "var(--accent-soft)", borderRadius: "5px", border: "1px solid var(--accent)" }}>
                {ratio}%
              </span>
              <button
                onClick={() => changeRatio(ratio + 5)}
                disabled={isPending}
                className="toolbar-btn"
                style={{ ...btnStyle, padding: "4px 8px", fontSize: "14px" }}
              >+</button>
            </div>
          )}

          {/* Toggle cible zéro */}
          <button
            onClick={() => setMasquerCibleZero((v) => !v)}
            className="toolbar-btn"
            style={{ ...btnStyle, background: masquerCibleZero ? "var(--bg-elev-2)" : "var(--accent)", color: masquerCibleZero ? "var(--text)" : "white", fontSize: "12px" }}
          >
            {masquerCibleZero ? `+ ${nbMasques} masqués` : "Masquer cible 0"}
          </button>

          <div style={{ flex: 1 }} />

          {/* Veille non clôturée */}
          {!veilleEstCloturee && (
            <span style={{ fontSize: "12px", color: "var(--orange)", padding: "4px 10px", background: "var(--orange-soft)", borderRadius: "6px" }}>
              ⚠ Saisie du {formatDateCourt(veille)} non clôturée
            </span>
          )}

          <button
            onClick={() => window.print()}
            className="toolbar-btn hide-mobile"
            style={{ ...btnStyle, background: "var(--accent)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}
          >
            🖨 Imprimer
          </button>
        </div>

        {/* Content */}
        <div className="print-container content-area" style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          {estFerme && (
            <div style={{ padding: "10px 16px", marginBottom: "16px", background: "var(--red-soft)", border: "1px solid var(--red)", borderRadius: "8px", fontSize: "13px", color: "var(--red)", fontWeight: 600 }}>
              🔒 Journée marquée comme fermée — aucune production prévue.
            </div>
          )}

          {/* Print header */}
          <div style={{ marginBottom: "20px", paddingBottom: "12px", borderBottom: "2px solid var(--border)", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
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

          {/* Categories */}
          {categoriesFiltrees.map((cat) => {
            const catTotal = cat.produits.reduce((s, p) => s + p.aProduire, 0);
            return (
              <div key={cat.id} style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 8px", background: "var(--bg-elev-2)", borderRadius: "6px", marginBottom: "4px" }}>
                  {cat.emoji && <span style={{ fontSize: "15px" }}>{cat.emoji}</span>}
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", flex: 1 }}>
                    {cat.nom}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: catTotal > 0 ? "var(--accent)" : "var(--text-dim)" }}>
                    {catTotal} à produire
                  </span>
                </div>

                {/* Column headers */}
                <div className="products-grid print-grid" style={{ display: "grid", gridTemplateColumns: "1fr 60px 64px 80px", gap: "8px", padding: "4px 8px", marginBottom: "2px" }}>
                  <span style={headerStyle}>Produit</span>
                  <span style={{ ...headerStyle, textAlign: "center" }}>Stock J-1</span>
                  <span style={{ ...headerStyle, textAlign: "center" }}>Cible</span>
                  <span style={{ ...headerStyle, textAlign: "right" }}>À produire</span>
                </div>

                {/* Product rows */}
                {cat.produits.map((p) => (
                  <div
                    key={p.id}
                    className="products-grid print-grid print-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 60px 64px 80px",
                      gap: "8px",
                      alignItems: "center",
                      padding: "5px 8px",
                      borderRadius: "4px",
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
                    {/* Nom */}
                    <span style={{ fontSize: "13px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: "4px" }}>
                      {p.nom}
                      {p.conserveExtra && p.conserveExtra > 0 && (
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--orange)", background: "var(--orange-soft)", padding: "1px 5px", borderRadius: "3px", flexShrink: 0 }}>
                          ⚡ +{p.conserveExtra}
                        </span>
                      )}
                    </span>

                    {/* Stock veille */}
                    <span style={{ fontSize: "13px", textAlign: "center", color: p.stockVeille > 0 ? "var(--orange)" : "var(--text-faint)", fontWeight: p.stockVeille > 0 ? 600 : 400 }}>
                      {p.stockVeille || "—"}
                    </span>

                    {/* Cible */}
                    <span style={{ fontSize: "13px", textAlign: "center", color: "var(--text-dim)" }}>
                      {p.cibleAujourdhui || "—"}
                    </span>

                    {/* À produire */}
                    <div style={{ textAlign: "right" }}>
                      {p.aProduire === 0 ? (
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--green)", background: "var(--green-soft)", padding: "2px 6px", borderRadius: "4px" }}>
                          ✓
                        </span>
                      ) : (
                        <div>
                          <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)" }}>{p.aProduire}</span>
                          {p.bufferDemain > 0 && (
                            <div style={{ fontSize: "9px", color: "var(--text-dim)", lineHeight: 1.2 }}>
                              +{p.bufferDemain} buffer
                            </div>
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
            <div style={{ padding: "48px", textAlign: "center", color: "var(--text-dim)", fontSize: "14px" }}>
              Aucun produit à afficher pour cette date.
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
