"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { upsertSaisie, setConserveExtra, cloturerJournee, decloturerJournee } from "./actions";
import { toast } from "sonner";

type Produit = {
  id: number;
  nom: string;
  couleur: string | null;
  ordre: number;
  cible: number;
  restant: number | null;
  conserveExtra: number | null;
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
  categories: Categorie[];
  isCloture: boolean;
  alertsProlong: Record<number, number>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  }).format(new Date(date + "T12:00:00"));
}

function wastePercent(cible: number, restant: number | null): number | null {
  if (restant === null || cible === 0) return null;
  return Math.round((restant / cible) * 100);
}

function WasteBadge({ cible, restant }: { cible: number; restant: number | null }) {
  const pct = wastePercent(cible, restant);
  if (pct === null) return null;
  const color = pct > 60 ? "var(--red)" : pct > 30 ? "var(--orange)" : "var(--green)";
  return <span style={{ fontSize: "11px", fontWeight: 600, color, minWidth: "36px", textAlign: "right" }}>{pct}%</span>;
}

export default function SaisieSoir({ date, typeJour, categories, isCloture, alertsProlong }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const initialValues: Record<number, string> = {};
  for (const cat of categories)
    for (const p of cat.produits)
      initialValues[p.id] = p.restant !== null ? String(p.restant) : "";

  const [values, setValues] = useState<Record<number, string>>(initialValues);
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const [conserveExtraMap, setConserveExtraMap] = useState<Record<number, number | null>>(() => {
    const m: Record<number, number | null> = {};
    for (const cat of categories)
      for (const p of cat.produits) m[p.id] = p.conserveExtra;
    return m;
  });

  const [showConserveInput, setShowConserveInput] = useState<Record<number, boolean>>({});
  const [conserveInputVal, setConserveInputVal] = useState<Record<number, string>>({});

  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const allProduits = categories.flatMap((c) => c.produits);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const conserveInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const handleChange = useCallback(
    (produitId: number, raw: string) => {
      if (isCloture) return;
      const val = raw.replace(/[^0-9]/g, "");
      setValues((prev) => ({ ...prev, [produitId]: val }));
      clearTimeout(timers.current[produitId]);
      timers.current[produitId] = setTimeout(async () => {
        const num = val === "" ? 0 : parseInt(val, 10);
        setSaving((prev) => ({ ...prev, [produitId]: true }));
        try {
          await upsertSaisie(date, produitId, num);
        } catch {
          toast.error("Erreur de sauvegarde");
        } finally {
          setSaving((prev) => ({ ...prev, [produitId]: false }));
        }
      }, 1200);
    },
    [date, isCloture]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, produitId: number) => {
      const idx = allProduits.findIndex((p) => p.id === produitId);
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = allProduits[idx + 1];
        if (next) inputRefs.current[next.id]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = allProduits[idx - 1];
        if (prev) inputRefs.current[prev.id]?.focus();
      }
    },
    [allProduits]
  );

  const handleConserveCircleClick = useCallback(
    (produitId: number) => {
      if (isCloture) return;
      if (conserveExtraMap[produitId]) {
        setConserveExtraMap((prev) => ({ ...prev, [produitId]: null }));
        setConserveExtra(date, produitId, null).catch(() => toast.error("Erreur"));
      } else {
        setShowConserveInput((prev) => ({ ...prev, [produitId]: true }));
        setConserveInputVal((prev) => ({ ...prev, [produitId]: "" }));
        setTimeout(() => conserveInputRefs.current[produitId]?.focus(), 50);
      }
    },
    [conserveExtraMap, date, isCloture]
  );

  const handleConserveConfirm = useCallback(
    (produitId: number) => {
      const qty = parseInt(conserveInputVal[produitId] || "0", 10);
      const val = qty > 0 ? qty : null;
      setConserveExtraMap((prev) => ({ ...prev, [produitId]: val }));
      setShowConserveInput((prev) => ({ ...prev, [produitId]: false }));
      setConserveExtra(date, produitId, val).catch(() => toast.error("Erreur"));
    },
    [conserveInputVal, date]
  );

  const handleConserveKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, produitId: number) => {
      if (e.key === "Enter") handleConserveConfirm(produitId);
      if (e.key === "Escape") setShowConserveInput((prev) => ({ ...prev, [produitId]: false }));
    },
    [handleConserveConfirm]
  );

  const changeDate = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    router.push(`${pathname}?date=${d.toISOString().slice(0, 10)}`);
  };

  const handleCloturer = () => {
    startTransition(async () => {
      try {
        await cloturerJournee(date);
        toast.success("Journée clôturée");
      } catch {
        toast.error("Erreur lors de la clôture");
      }
    });
  };

  const handleDecloturer = () => {
    startTransition(async () => {
      try {
        await decloturerJournee(date);
        toast.success("Clôture annulée");
      } catch {
        toast.error("Erreur lors de la déclôture");
      }
    });
  };

  const totalCible = allProduits.reduce((s, p) => s + p.cible, 0);
  const totalRestant = allProduits.reduce((s, p) => {
    const v = values[p.id];
    return s + (v !== "" ? parseInt(v || "0", 10) : 0);
  }, 0);
  const filledCount = allProduits.filter((p) => values[p.id] !== "").length;
  const totalProduits = allProduits.length;
  const typeJourLabel = typeJour === "sem" ? "Semaine" : typeJour === "sam" ? "Samedi" : "Dimanche";

  return (
    <>
    <style>{`
      @media (max-width: 640px) {
        .toolbar-wrap        { padding: 10px 12px !important; gap: 8px !important; }
        .toolbar-btn         { min-height: 44px !important; padding: 8px 14px !important; font-size: 14px !important; }
        .date-display        { min-width: 0 !important; font-size: 12px !important; }
        .content-area        { padding: 10px 12px !important; }
        .products-grid       { grid-template-columns: 1fr 44px 70px auto !important; gap: 5px !important; padding: 6px 6px !important; }
        .waste-badge         { display: none !important; }
        .restant-input       { min-height: 44px !important; font-size: 16px !important; }
        .conserve-circle     { width: 36px !important; height: 36px !important; }
        .conserve-confirm-btn{ width: 36px !important; height: 36px !important; font-size: 14px !important; }
        .conserve-qty-input  { width: 52px !important; height: 36px !important; }
        .footer-bar          { gap: 10px !important; padding: 10px 12px !important; flex-wrap: wrap !important; }
      }
    `}</style>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Toolbar */}
      <div
        className="toolbar-wrap"
        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-elev)", flexShrink: 0, flexWrap: "wrap" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button onClick={() => changeDate(-1)} className="toolbar-btn" style={btnStyle}>‹</button>
          <span className="date-display" style={{ fontSize: "13px", fontWeight: 500, padding: "4px 10px", background: "var(--bg-elev-2)", borderRadius: "6px", textTransform: "capitalize", minWidth: "160px", textAlign: "center", color: "var(--text)", border: "1px solid var(--border)" }}>
            {formatDate(date)}
          </span>
          <button onClick={() => changeDate(1)} className="toolbar-btn" style={btnStyle}>›</button>
        </div>

        <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "4px", background: "var(--bg-elev-2)", color: "var(--text)", letterSpacing: "0.05em", border: "1px solid var(--border)" }}>
          {typeJourLabel}
        </span>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
          {filledCount}/{totalProduits} saisis
        </span>

        {isCloture ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--green)", padding: "4px 10px", background: "rgba(16,185,129,0.1)", borderRadius: "6px", border: "1px solid rgba(16,185,129,0.3)" }}>
              ✓ Clôturée
            </span>
            <button onClick={handleDecloturer} disabled={isPending} className="toolbar-btn" style={{ ...btnStyle, color: "var(--text-dim)", fontSize: "12px" }}>
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={handleCloturer}
            disabled={isPending || filledCount === 0}
            className="toolbar-btn"
            style={{ ...btnStyle, background: filledCount === 0 ? "var(--bg-elev-2)" : "var(--accent)", color: filledCount === 0 ? "var(--text-dim)" : "white", fontWeight: 600, border: filledCount === 0 ? "1px solid var(--border)" : "1px solid var(--accent)" }}
          >
            Clôturer
          </button>
        )}
      </div>

      {/* Content */}
      <div className="content-area" style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        {isCloture && (
          <div style={{ marginBottom: "16px", padding: "10px 16px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "8px", fontSize: "13px", color: "var(--green)" }}>
            Journée clôturée — lecture seule. Cliquez "Annuler" pour modifier.
          </div>
        )}

        {categories.map((cat) => (
          <div key={cat.id} style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              {cat.emoji && <span style={{ fontSize: "16px" }}>{cat.emoji}</span>}
              <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-dim)", textTransform: "uppercase" }}>{cat.nom}</span>
              <span style={{ fontSize: "11px", color: "var(--border)", marginLeft: "auto" }}>
                {cat.produits.filter((p) => values[p.id] !== "").length}/{cat.produits.length}
              </span>
            </div>

            <div className="products-grid" style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 48px auto", gap: "8px", padding: "0 8px", marginBottom: "4px" }}>
              <span style={headerStyle}>Produit</span>
              <span style={{ ...headerStyle, textAlign: "center" }}>Cible</span>
              <span style={{ ...headerStyle, textAlign: "center" }}>Restant</span>
              <span style={{ ...headerStyle, textAlign: "right" }}>%</span>
              <span style={headerStyle} />
            </div>

            {cat.produits.map((p) => {
              const val = values[p.id] ?? "";
              const restantNum = val !== "" ? parseInt(val, 10) : null;
              const isSaving = saving[p.id];
              const hasValue = val !== "";
              const hasConserve = (conserveExtraMap[p.id] ?? 0) > 0;
              const isProlong = (alertsProlong[p.id] ?? 0) > 0;
              const showInput = showConserveInput[p.id];
              const couleurBg = isProlong ? "rgba(245,158,11,0.10)" : hasConserve ? "rgba(239,68,68,0.06)" : p.couleur ? `${p.couleur}14` : hasValue ? "rgba(99,102,241,0.04)" : "transparent";

              return (
                <div
                  key={p.id}
                  className="products-grid"
                  style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 48px auto", gap: "8px", alignItems: "center", padding: "4px 8px", borderRadius: "6px", background: couleurBg, borderLeft: isProlong ? "3px solid var(--orange)" : p.couleur ? `3px solid ${p.couleur}` : undefined, transition: "background 0.1s" }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
                    <span style={{ fontSize: "13px", color: isCloture ? "var(--text-dim)" : "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {isSaving ? <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>{p.nom} <span style={{ opacity: 0.5 }}>●</span></span> : p.nom}
                    </span>
                    {isProlong && (
                      <span style={{ fontSize: "10px", color: "var(--orange)", fontWeight: 700 }}>⚠ {alertsProlong[p.id]} en prolongation</span>
                    )}
                  </div>

                  <span style={{ fontSize: "13px", color: "var(--text-dim)", textAlign: "center" }}>{p.cible || "—"}</span>

                  <input
                    ref={(el) => { inputRefs.current[p.id] = el; }}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={val}
                    readOnly={isCloture}
                    onChange={(e) => handleChange(p.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, p.id)}
                    placeholder="—"
                    className="restant-input"
                    style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: `1px solid ${hasValue ? "var(--accent)" : "var(--border)"}`, background: isCloture ? "var(--bg-elev)" : "var(--bg-elev-2)", color: "var(--text)", fontSize: "14px", fontWeight: 600, textAlign: "center", outline: "none", cursor: isCloture ? "default" : "text" }}
                  />

                  <span className="waste-badge"><WasteBadge cible={p.cible} restant={restantNum} /></span>

                  <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                    {showInput && (
                      <>
                        <input
                          ref={(el) => { conserveInputRefs.current[p.id] = el; }}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={conserveInputVal[p.id] ?? ""}
                          onChange={(e) => setConserveInputVal((prev) => ({ ...prev, [p.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                          onKeyDown={(e) => handleConserveKeyDown(e, p.id)}
                          onBlur={() => handleConserveConfirm(p.id)}
                          placeholder="qté"
                          className="conserve-qty-input"
                          style={{ width: "44px", padding: "3px 5px", borderRadius: "5px", border: "1px solid var(--orange)", background: "var(--bg-elev-2)", color: "var(--text)", fontSize: "12px", fontWeight: 600, textAlign: "center", outline: "none" }}
                        />
                        <button
                          onMouseDown={(e) => { e.preventDefault(); handleConserveConfirm(p.id); }}
                          className="conserve-confirm-btn"
                          style={{ width: "20px", height: "20px", borderRadius: "4px", border: "1px solid var(--orange)", background: "var(--orange-soft)", color: "var(--orange)", cursor: "pointer", fontSize: "11px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >✓</button>
                      </>
                    )}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <button
                        onClick={() => handleConserveCircleClick(p.id)}
                        disabled={isCloture}
                        className="conserve-circle"
                        style={{ width: "22px", height: "22px", borderRadius: "50%", border: `2px solid ${hasConserve ? "var(--red)" : "var(--border)"}`, background: hasConserve ? "var(--red)" : "transparent", cursor: isCloture ? "default" : "pointer", flexShrink: 0, padding: 0 }}
                      />
                      {hasConserve && (
                        <span style={{ position: "absolute", top: "-6px", right: "-6px", background: "var(--red)", color: "white", borderRadius: "9px", fontSize: "9px", fontWeight: 700, padding: "1px 4px", lineHeight: 1.2, pointerEvents: "none" }}>
                          {conserveExtraMap[p.id]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="footer-bar"
        style={{ display: "flex", alignItems: "center", gap: "24px", padding: "10px 20px", borderTop: "1px solid var(--border)", background: "var(--bg-elev)", flexShrink: 0, fontSize: "12px", color: "var(--text-dim)" }}
      >
        <span>Angoulins · {formatDate(date)}</span>
        <span>Cible : <strong style={{ color: "var(--text)" }}>{totalCible}</strong></span>
        <span>Restant : <strong style={{ color: "var(--text)" }}>{totalRestant}</strong></span>
        {totalCible > 0 && (
          <span>Perte : <strong style={{ color: totalRestant / totalCible > 0.3 ? "var(--orange)" : "var(--green)" }}>{Math.round((totalRestant / totalCible) * 100)}%</strong></span>
        )}
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
