"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { updateCible, toggleActifAngoulins, ajouterProduit } from "./actions";
import { toast } from "sonner";

type Produit = {
  id: number;
  nom: string;
  actifAngoulins: boolean;
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

  const [actifMap, setActifMap] = useState<Record<number, boolean>>(() => {
    const m: Record<number, boolean> = {};
    for (const cat of categories)
      for (const p of cat.produits) m[p.id] = p.actifAngoulins;
    return m;
  });

  const [newNom, setNewNom] = useState<Record<number, string>>({});
  const [showAdd, setShowAdd] = useState<Record<number, boolean>>({});
  const [savingCible, setSavingCible] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();
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

  const handleToggle = useCallback((produitId: number) => {
    const next = !actifMap[produitId];
    setActifMap((prev) => ({ ...prev, [produitId]: next }));
    startTransition(async () => {
      try { await toggleActifAngoulins(produitId, next); }
      catch {
        setActifMap((prev) => ({ ...prev, [produitId]: !next }));
        toast.error("Erreur de sauvegarde");
      }
    });
  }, [actifMap]);

  const handleAjouter = useCallback((categorieId: number) => {
    const nom = (newNom[categorieId] ?? "").trim();
    if (!nom) return;
    startTransition(async () => {
      try {
        await ajouterProduit(categorieId, nom);
        setNewNom((prev) => ({ ...prev, [categorieId]: "" }));
        setShowAdd((prev) => ({ ...prev, [categorieId]: false }));
        toast.success("Produit ajouté");
      } catch { toast.error("Erreur lors de l'ajout"); }
    });
  }, [newNom]);

  const totalActifs = categories.reduce((s, c) => s + c.produits.filter((p) => actifMap[p.id]).length, 0);
  const totalProduits = categories.reduce((s, c) => s + c.produits.length, 0);
  const gridCols = "1fr 52px 100px 100px";

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
          <span style={{ ...headerStyle, textAlign: "center" }}>Actif</span>
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
                {cat.produits.filter((p) => actifMap[p.id]).length}/{cat.produits.length}
              </span>
              <button
                onClick={() => setShowAdd((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-elev)", color: "var(--text-dim)", cursor: "pointer" }}
              >
                + Produit
              </button>
            </div>

            {showAdd[cat.id] && (
              <div style={{ display: "flex", gap: "6px", padding: "6px 8px", marginBottom: "4px" }}>
                <input
                  type="text"
                  placeholder="Nom du produit"
                  value={newNom[cat.id] ?? ""}
                  onChange={(e) => setNewNom((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAjouter(cat.id); }}
                  style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-elev-2)", color: "var(--text)", fontSize: "13px", outline: "none" }}
                  autoFocus
                />
                <button
                  onClick={() => handleAjouter(cat.id)}
                  style={{ padding: "6px 14px", borderRadius: "6px", border: "none", background: "var(--accent)", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  Ajouter
                </button>
                <button
                  onClick={() => setShowAdd((prev) => ({ ...prev, [cat.id]: false }))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: "13px", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            )}

            {cat.produits.map((p) => {
              const couleur = p.couleur;
              const actif = actifMap[p.id] ?? true;
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
                    opacity: actif ? 1 : 0.4,
                  }}
                >
                  <span style={{ fontSize: "13px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.nom}
                  </span>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                      onClick={() => handleToggle(p.id)}
                      title={actif ? "Désactiver sur Angoulins" : "Activer sur Angoulins"}
                      style={{
                        width: "32px", height: "18px", borderRadius: "9px",
                        border: "none", cursor: "pointer", flexShrink: 0,
                        background: actif ? "var(--accent)" : "var(--border)",
                        position: "relative", transition: "background 0.15s",
                      }}
                    >
                      <span style={{
                        position: "absolute", top: "3px",
                        left: actif ? "15px" : "3px",
                        width: "12px", height: "12px", borderRadius: "50%",
                        background: "#fff", transition: "left 0.15s",
                      }} />
                    </button>
                  </div>
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
