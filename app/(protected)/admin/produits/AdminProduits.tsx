"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { updateCible } from "./actions";
import { toast } from "sonner";

type Produit = {
  id: number;
  nom: string;
  actif: boolean;
  couleur: string | null;
  cibles: Record<string, number>;
};

type Categorie = {
  id: number;
  nom: string;
  emoji: string | null;
  ordre: number;
  produits: Produit[];
};

const TYPE_JOURS = ["sem", "sam"] as const;
const TJ_LABELS = { sem: "Semaine", sam: "Samedi" };

export default function AdminProduits({ categories }: { categories: Categorie[] }) {
  const [ciblesMap, setCiblesMap] = useState<Record<number, Record<string, string>>>(() => {
    const m: Record<number, Record<string, string>> = {};
    for (const cat of categories)
      for (const p of cat.produits) {
        m[p.id] = {};
        for (const tj of TYPE_JOURS) m[p.id][tj] = String(p.cibles[tj] ?? 0);
      }
    return m;
  });

  const [savingCible, setSavingCible] = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleCible = useCallback(
    (produitId: number, typeJour: "sem" | "sam", raw: string) => {
      const val = raw.replace(/[^0-9]/g, "");
      setCiblesMap((prev) => ({ ...prev, [produitId]: { ...prev[produitId], [typeJour]: val } }));
      const key = `${produitId}-${typeJour}`;
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(async () => {
        const num = val === "" ? 0 : parseInt(val, 10);
        setSavingCible((prev) => ({ ...prev, [key]: true }));
        try { await updateCible(produitId, typeJour, num); }
        catch { toast.error("Erreur de sauvegarde"); }
        finally { setSavingCible((prev) => ({ ...prev, [key]: false })); }
      }, 800);
    },
    []
  );

  const totalActifs = categories.reduce((s, c) => s + c.produits.filter((p) => p.actif).length, 0);
  const totalProduits = categories.reduce((s, c) => s + c.produits.length, 0);
  const gridCols = "1fr 100px 100px";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-elev)", flexShrink: 0 }}>
        <span style={{ fontWeight: 600, fontSize: "14px" }}>Cibles Angoulins</span>
        <span style={{ fontSize: "12px", padding: "3px 8px", borderRadius: "4px", background: "var(--bg-elev-2)", color: "var(--text-dim)" }}>
          {totalActifs}/{totalProduits} produits actifs
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>Sauvegarde automatique</span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "8px", padding: "4px 8px", marginBottom: "4px", position: "sticky", top: 0, background: "var(--bg)", zIndex: 1 }}>
          <span style={headerStyle}>Produit</span>
          {TYPE_JOURS.map((tj) => (
            <span key={tj} style={{ ...headerStyle, textAlign: "center" }}>{TJ_LABELS[tj]}</span>
          ))}
        </div>

        {categories.map((cat) => (
          <div key={cat.id} style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 8px", background: "var(--bg-elev-2)", borderRadius: "6px", marginBottom: "4px" }}>
              {cat.emoji && <span style={{ fontSize: "14px" }}>{cat.emoji}</span>}
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", flex: 1 }}>
                {cat.nom}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>
                {cat.produits.filter((p) => p.actif).length}/{cat.produits.length}
              </span>
            </div>

            {cat.produits.map((p) => {
              const couleur = p.couleur;
              return (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: gridCols,
                    gap: "8px",
                    alignItems: "center",
                    padding: "5px 8px",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: couleur ? `3px solid ${couleur}` : undefined,
                    background: couleur ? `${couleur}10` : "transparent",
                    opacity: p.actif ? 1 : 0.4,
                  }}
                >
                  <span style={{ fontSize: "13px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.nom}
                  </span>
                  {TYPE_JOURS.map((tj) => {
                    const key = `${p.id}-${tj}`;
                    const val = ciblesMap[p.id]?.[tj] ?? "0";
                    return (
                      <input
                        key={key}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={val}
                        onChange={(e) => handleCible(p.id, tj, e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: `1px solid ${savingCible[key] ? "var(--accent)" : "var(--border)"}`, background: "var(--bg-elev-2)", color: "var(--text)", fontSize: "14px", fontWeight: 600, textAlign: "center", outline: "none", transition: "border-color 0.15s" }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em",
  textTransform: "uppercase", color: "var(--text-dim)",
};
