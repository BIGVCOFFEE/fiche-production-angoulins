"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

type Produit = {
  id: number;
  nom: string;
  couleur: string | null;
  cible: number;
  restantVeille: number | null;
  conserveExtra: number | null;
  aProduire: number;
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
  typeJour: string;
  veille: string;
  categories: Categorie[];
  veilleEstCloturee: boolean;
  estFerme: boolean;
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

export default function FicheMatin({
  date, typeJour, veille, categories, veilleEstCloturee, estFerme,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [masquerCibleZero, setMasquerCibleZero] = useState(true);

  const changeDate = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    router.push(`${pathname}?date=${d.toISOString().slice(0, 10)}`);
  };

  const categoriesFiltrees = categories
    .map((cat) => ({
      ...cat,
      produits: masquerCibleZero
        ? cat.produits.filter((p) => p.cible > 0 || (p.restantVeille ?? 0) > 0)
        : cat.produits,
    }))
    .filter((cat) => cat.produits.length > 0);

  const totalAProduire = categoriesFiltrees.reduce(
    (s, c) => s + c.produits.reduce((ss, p) => ss + p.aProduire, 0), 0
  );
  const totalCible = categoriesFiltrees.reduce(
    (s, c) => s + c.produits.reduce((ss, p) => ss + p.cible, 0), 0
  );
  const totalRestant = categoriesFiltrees.reduce(
    (s, c) => s + c.produits.reduce((ss, p) => ss + (p.restantVeille ?? 0), 0), 0
  );
  const nbMasques = categories.reduce(
    (s, c) => s + c.produits.filter((p) => p.cible === 0 && (p.restantVeille ?? 0) === 0).length, 0
  );

  const typeJourLabel = typeJour === "sam" ? "Samedi" : typeJour === "dim" ? "Dimanche" : "Semaine";

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-container { padding: 12mm 15mm !important; }
          .print-table { font-size: 10pt !important; }
        }
        @media (max-width: 640px) {
          .toolbar-wrap { padding: 10px 12px !important; gap: 8px !important; }
          .toolbar-btn { min-height: 44px !important; padding: 8px 14px !important; font-size: 14px !important; }
          .date-display { min-width: 0 !important; font-size: 12px !important; }
          .hide-mobile { display: none !important; }
          .content-area { padding: 10px 12px !important; }
          .products-grid { grid-template-columns: 1fr 44px 44px 56px !important; gap: 5px !important; padding: 7px 6px !important; }
          .footer-bar { gap: 10px !important; padding: 10px 12px !important; flex-wrap: wrap; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Toolbar */}
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
                Fiche du matin — Angoulins
              </h1>
              <p style={{ fontSize: "13px", color: "var(--text-dim)", margin: "4px 0 0", textTransform: "capitalize" }}>
                {formatDate(date)} · {typeJourLabel}
              </p>
            </div>
            <div style={{ textAlign: "right", fontSize: "12px", color: "var(--text-dim)" }}>
              <div>Restant veille : <strong style={{ color: "var(--text)" }}>{totalRestant}</strong></div>
              <div>Cible : <strong style={{ color: "var(--text)" }}>{totalCible}</strong></div>
              <div style={{ marginTop: "4px", fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>
                À produire : {totalAProduire}
              </div>
            </div>
          </div>

          {categoriesFiltrees.map((cat) => {
            const catAProduire = cat.produits.reduce((s, p) => s + p.aProduire, 0);
            return (
              <div key={cat.id} style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 8px", background: "var(--bg-elev-2)", borderRadius: "6px", marginBottom: "4px" }}>
                  {cat.emoji && <span style={{ fontSize: "15px" }}>{cat.emoji}</span>}
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", flex: 1 }}>{cat.nom}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: catAProduire > 0 ? "var(--accent)" : "var(--text-dim)" }}>
                    {catAProduire} à produire
                  </span>
                </div>

                <div className="products-grid print-table" style={{ display: "grid", gridTemplateColumns: "1fr 70px 70px 80px", gap: "8px", padding: "4px 8px", marginBottom: "2px" }}>
                  <span style={headerStyle}>Produit</span>
                  <span style={{ ...headerStyle, textAlign: "center" }}>Restant</span>
                  <span style={{ ...headerStyle, textAlign: "center" }}>Cible</span>
                  <span style={{ ...headerStyle, textAlign: "right" }}>À produire</span>
                </div>

                {cat.produits.map((p) => (
                  <div
                    key={p.id}
                    className="products-grid print-table"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 70px 70px 80px",
                      gap: "8px",
                      alignItems: "center",
                      padding: "5px 8px",
                      borderRadius: "4px",
                      borderBottom: "1px solid var(--border)",
                      borderLeft: p.conserveExtra && p.conserveExtra > 0
                        ? "3px solid var(--orange)"
                        : p.couleur ? `3px solid ${p.couleur}` : undefined,
                      background: p.conserveExtra && p.conserveExtra > 0
                        ? "rgba(245,158,11,0.08)"
                        : p.couleur ? `${p.couleur}14` : "transparent",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                      {p.nom}
                      {p.conserveExtra && p.conserveExtra > 0 && (
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--orange)", background: "var(--orange-soft)", padding: "1px 5px", borderRadius: "3px", flexShrink: 0 }}>
                          ⚡ +{p.conserveExtra} prolongé
                        </span>
                      )}
                    </span>

                    <span style={{ fontSize: "13px", textAlign: "center", color: p.restantVeille === null ? "var(--text-faint)" : p.restantVeille > 0 ? "var(--orange)" : "var(--text-dim)", fontWeight: p.restantVeille !== null && p.restantVeille > 0 ? 600 : 400 }}>
                      {p.restantVeille === null ? "—" : p.restantVeille}
                    </span>

                    <span style={{ fontSize: "13px", textAlign: "center", color: "var(--text-dim)" }}>
                      {p.cible}
                    </span>

                    <span style={{ fontSize: "15px", fontWeight: 700, textAlign: "right", color: p.aProduire === 0 ? "var(--text-faint)" : "var(--accent)" }}>
                      {p.aProduire === 0 ? "✓" : p.aProduire}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}

          {categoriesFiltrees.length === 0 && (
            <div style={{ padding: "48px", textAlign: "center", color: "var(--text-dim)", fontSize: "14px" }}>
              Aucun produit à afficher.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="no-print footer-bar"
          style={{ display: "flex", alignItems: "center", gap: "24px", padding: "10px 20px", borderTop: "1px solid var(--border)", background: "var(--bg-elev)", flexShrink: 0, fontSize: "12px", color: "var(--text-dim)" }}
        >
          <span style={{ textTransform: "capitalize" }}>{formatDate(date)}</span>
          <span>Restant veille : <strong style={{ color: "var(--text)" }}>{totalRestant}</strong></span>
          <span>Cible : <strong style={{ color: "var(--text)" }}>{totalCible}</strong></span>
          <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: "13px" }}>
            Total à produire : {totalAProduire}
          </span>
        </div>
      </div>
    </>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "5px 12px", borderRadius: "6px", border: "1px solid var(--border)",
  background: "var(--bg-elev-2)", color: "var(--text)", cursor: "pointer", fontSize: "13px",
};

const headerStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em",
  textTransform: "uppercase" as const, color: "var(--text-dim)",
};
