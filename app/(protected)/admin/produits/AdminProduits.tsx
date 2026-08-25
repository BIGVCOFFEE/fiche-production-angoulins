"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import {
  updateCible, toggleActifAngoulins, updateCouleur, updateDureeVie,
  updateTranchesParUnite, updateEstPainProduit,
  ajouterProduit, supprimerProduit, renommerProduit, setRatioLendemain,
} from "./actions";
import { toast } from "sonner";

type Produit = {
  id: number;
  nom: string;
  actifAngoulins: boolean;
  couleur: string | null;
  dureeVie: number;
  tranchesParUnite: number;
  estPain: boolean;
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

const COULEURS = [
  { val: "#f97316", label: "Orange" },
  { val: "#ef4444", label: "Rouge" },
  { val: "#eab308", label: "Jaune" },
  { val: "#22c55e", label: "Vert" },
  { val: "#3b82f6", label: "Bleu" },
  { val: "#a855f7", label: "Violet" },
  { val: "#ec4899", label: "Rose" },
  { val: "#14b8a6", label: "Turquoise" },
];

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function AdminProduits({
  categories,
  ratio: initialRatio,
}: {
  categories: Categorie[];
  ratio: number;
}) {
  const [actifMap, setActifMap] = useState<Record<number, boolean>>(() => {
    const m: Record<number, boolean> = {};
    for (const cat of categories) for (const p of cat.produits) m[p.id] = p.actifAngoulins;
    return m;
  });

  const [dureeVieMap, setDureeVieMap] = useState<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    for (const cat of categories) for (const p of cat.produits) m[p.id] = p.dureeVie;
    return m;
  });

  const [tranchesMap, setTranchesMap] = useState<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    for (const cat of categories) for (const p of cat.produits) m[p.id] = p.tranchesParUnite;
    return m;
  });

  const [estPainProdMap, setEstPainProdMap] = useState<Record<number, boolean>>(() => {
    const m: Record<number, boolean> = {};
    for (const cat of categories) for (const p of cat.produits) m[p.id] = p.estPain;
    return m;
  });

  const [couleurMap, setCouleurMap] = useState<Record<number, string | null>>(() => {
    const m: Record<number, string | null> = {};
    for (const cat of categories) for (const p of cat.produits) m[p.id] = p.couleur;
    return m;
  });

  const [ciblesMap, setCiblesMap] = useState<Record<number, Record<string, string>>>(() => {
    const m: Record<number, Record<string, string>> = {};
    for (const cat of categories)
      for (const p of cat.produits) {
        m[p.id] = {};
        for (const tj of TYPE_JOURS) m[p.id][tj] = String(p.cibles[tj] ?? 0);
      }
    return m;
  });

  const [catProduits, setCatProduits] = useState<Record<number, { id: number; nom: string }[]>>(() => {
    const m: Record<number, { id: number; nom: string }[]> = {};
    for (const cat of categories) m[cat.id] = cat.produits.map((p) => ({ id: p.id, nom: p.nom }));
    return m;
  });

  const [ratio, setRatio] = useState(initialRatio);
  const [savingCible, setSavingCible] = useState<Record<string, boolean>>({});
  const [addingIn, setAddingIn] = useState<number | null>(null);
  const [newNom, setNewNom] = useState("");
  const [colorPickerFor, setColorPickerFor] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [isPending, startTransition] = useTransition();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleToggle = async (produitId: number) => {
    const next = !actifMap[produitId];
    setActifMap((prev) => ({ ...prev, [produitId]: next }));
    try { await toggleActifAngoulins(produitId, next); }
    catch { setActifMap((prev) => ({ ...prev, [produitId]: !next })); toast.error("Erreur"); }
  };

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

  const handleDureeVie = async (produitId: number, val: number) => {
    setDureeVieMap((prev) => ({ ...prev, [produitId]: val }));
    try { await updateDureeVie(produitId, val); }
    catch { toast.error("Erreur de sauvegarde"); }
  };

  const handlePainSelect = async (produitId: number, val: string) => {
    const wasPain = estPainProdMap[produitId];
    const isPain = val === "pain";
    const tranches = isPain ? 0 : parseInt(val) || 0;
    setTranchesMap((prev) => ({ ...prev, [produitId]: tranches }));
    setEstPainProdMap((prev) => ({ ...prev, [produitId]: isPain }));
    try {
      await updateTranchesParUnite(produitId, tranches);
      if (isPain !== wasPain) await updateEstPainProduit(produitId, isPain);
    } catch { toast.error("Erreur de sauvegarde"); }
  };

  const handleCouleur = async (produitId: number, couleur: string | null) => {
    setCouleurMap((prev) => ({ ...prev, [produitId]: couleur }));
    setColorPickerFor(null);
    try { await updateCouleur(produitId, couleur); }
    catch { toast.error("Erreur de sauvegarde"); }
  };

  const handleAjouter = async (categorieId: number) => {
    if (!newNom.trim()) return;
    startTransition(async () => {
      try {
        const id = await ajouterProduit(categorieId, newNom);
        setCatProduits((prev) => ({
          ...prev,
          [categorieId]: [...(prev[categorieId] ?? []), { id, nom: newNom.trim() }],
        }));
        setActifMap((prev) => ({ ...prev, [id]: true }));
        setDureeVieMap((prev) => ({ ...prev, [id]: 48 }));
        setTranchesMap((prev) => ({ ...prev, [id]: 0 }));
        setEstPainProdMap((prev) => ({ ...prev, [id]: false }));
        setCouleurMap((prev) => ({ ...prev, [id]: null }));
        setCiblesMap((prev) => ({
          ...prev,
          [id]: Object.fromEntries(TYPE_JOURS.map((tj) => [tj, "0"])),
        }));
        setNewNom(""); setAddingIn(null);
        toast.success("Produit ajouté");
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    });
  };

  const handleRenommer = (categorieId: number) => {
    const id = editingId;
    const val = editingVal.trim();
    setEditingId(null);
    setEditingVal("");
    if (!id || !val) return;
    const prev = catProduits[categorieId]?.find((p) => p.id === id)?.nom;
    if (val === prev) return;
    setCatProduits((m) => ({
      ...m,
      [categorieId]: m[categorieId].map((p) => p.id === id ? { ...p, nom: val } : p),
    }));
    startTransition(async () => {
      try { await renommerProduit(id, val); toast.success("Renommé"); }
      catch (e: unknown) {
        setCatProduits((m) => ({
          ...m,
          [categorieId]: m[categorieId].map((p) => p.id === id ? { ...p, nom: prev ?? p.nom } : p),
        }));
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const handleSupprimer = (produitId: number, categorieId: number, nomProduit: string) => {
    if (!window.confirm(`Supprimer « ${nomProduit} » ? Cette action est irréversible.`)) return;
    startTransition(async () => {
      try {
        await supprimerProduit(produitId);
        setCatProduits((prev) => ({ ...prev, [categorieId]: prev[categorieId].filter((p) => p.id !== produitId) }));
        toast.success("Produit supprimé");
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    });
  };

  const handleRatio = (delta: number) => {
    const next = Math.max(0, Math.min(100, ratio + delta));
    setRatio(next);
    startTransition(async () => {
      try { await setRatioLendemain(next); }
      catch { setRatio(ratio); toast.error("Erreur"); }
    });
  };

  const totalActifs = Object.values(actifMap).filter(Boolean).length;
  const totalProduits = Object.values(actifMap).length;

  // nom | actif | durée | pain/sachet | couleur | sem | sam | suppr
  const gridCols = "1fr 44px 52px 96px 44px 80px 80px 32px";

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
      onClick={() => setColorPickerFor(null)}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-elev)", flexShrink: 0, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: "14px" }}>Produits & Cibles Angoulins</span>
        <span style={{ fontSize: "12px", padding: "3px 8px", borderRadius: "4px", background: "var(--bg-elev-2)", color: "var(--text-dim)" }}>
          {totalActifs}/{totalProduits} actifs
        </span>
        <div style={{ flex: 1 }} />
        {/* Ratio lendemain */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Buffer lendemain :</span>
          <button
            onClick={() => handleRatio(-5)}
            disabled={isPending}
            style={{ width: "30px", height: "30px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-elev-2)", color: "var(--text)", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >−</button>
          <span style={{ minWidth: "48px", textAlign: "center", fontSize: "14px", fontWeight: 700, color: "var(--accent)", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--accent)", background: "var(--accent-soft)" }}>
            {ratio}%
          </span>
          <button
            onClick={() => handleRatio(5)}
            disabled={isPending}
            style={{ width: "30px", height: "30px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-elev-2)", color: "var(--text)", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >+</button>
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>Sauvegarde automatique</span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "4px", padding: "4px 8px", marginBottom: "4px", position: "sticky", top: 0, background: "var(--bg)", zIndex: 1 }}>
          <span style={headerStyle}>Produit</span>
          <span style={{ ...headerStyle, textAlign: "center" }}>Actif</span>
          <span style={{ ...headerStyle, textAlign: "center" }}>Durée</span>
          <span style={{ ...headerStyle, textAlign: "center" }}>Pain</span>
          <span style={{ ...headerStyle, textAlign: "center" }}>Coul.</span>
          {TYPE_JOURS.map((tj) => (
            <span key={tj} style={{ ...headerStyle, textAlign: "center" }}>{TJ_LABELS[tj]}</span>
          ))}
          <span style={headerStyle} />
        </div>

        {categories.map((cat) => {
          const prodsList = catProduits[cat.id] ?? [];
          return (
            <div key={cat.id} style={{ marginBottom: "24px" }}>
              {/* Category header */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 8px", background: "var(--bg-elev-2)", borderRadius: "6px", marginBottom: "4px" }}>
                {cat.emoji && <span style={{ fontSize: "14px" }}>{cat.emoji}</span>}
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", flex: 1 }}>
                  {cat.nom}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>
                  {prodsList.filter((lp) => actifMap[lp.id]).length}/{prodsList.length}
                </span>
              </div>

              {/* Product rows */}
              {prodsList.map((lp) => {
                const p = cat.produits.find((x) => x.id === lp.id);
                const isActif = actifMap[lp.id] ?? true;
                const couleur = couleurMap[lp.id] ?? null;

                return (
                  <div
                    key={lp.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: gridCols,
                      gap: "4px",
                      alignItems: "center",
                      padding: "4px 8px",
                      borderBottom: "1px solid var(--border)",
                      borderRadius: couleur ? "4px" : undefined,
                      background: couleur ? hexToRgba(couleur, 0.08) : "transparent",
                      opacity: isActif ? 1 : 0.4,
                      transition: "opacity 0.15s, background 0.15s",
                      position: "relative",
                    }}
                  >
                    {couleur && (
                      <div style={{ position: "absolute", left: 0, top: "4px", bottom: "4px", width: "3px", borderRadius: "2px", background: couleur }} />
                    )}

                    {editingId === lp.id ? (
                      <input
                        autoFocus
                        value={editingVal}
                        onChange={(e) => setEditingVal(e.target.value)}
                        onBlur={() => handleRenommer(cat.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.currentTarget.blur(); }
                          if (e.key === "Escape") { setEditingId(null); setEditingVal(""); }
                        }}
                        style={{ fontSize: "13px", color: "var(--text)", background: "var(--bg-elev-2)", border: "1px solid var(--accent)", borderRadius: "4px", padding: "2px 6px", outline: "none", width: "100%", paddingLeft: couleur ? "8px" : undefined }}
                      />
                    ) : (
                      <span
                        onDoubleClick={() => { setEditingId(lp.id); setEditingVal(lp.nom); }}
                        title="Double-cliquer pour renommer"
                        style={{ fontSize: "13px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingLeft: couleur ? "8px" : 0, cursor: "text" }}
                      >
                        {lp.nom}
                      </span>
                    )}

                    {/* Actif toggle */}
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button
                        onClick={() => handleToggle(lp.id)}
                        style={{ width: "36px", height: "20px", borderRadius: "10px", border: "none", background: isActif ? "var(--accent)" : "var(--border-strong, var(--border))", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
                      >
                        <span style={{ position: "absolute", top: "2px", left: isActif ? "18px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
                      </button>
                    </div>

                    {/* Durée de vie */}
                    <select
                      value={dureeVieMap[lp.id] ?? 48}
                      onChange={(e) => handleDureeVie(lp.id, Number(e.target.value))}
                      style={selectStyle}
                    >
                      <option value={24}>24h</option>
                      <option value={48}>48h</option>
                      <option value={72}>72h</option>
                      <option value={96}>96h</option>
                    </select>

                    {/* Tranches pain / sachet */}
                    <select
                      value={estPainProdMap[lp.id] ? "pain" : String(tranchesMap[lp.id] ?? 0)}
                      onChange={(e) => handlePainSelect(lp.id, e.target.value)}
                      title="Tranches de pain de mie utilisées par unité (calcul besoin en sachet)"
                      style={selectStyle}
                    >
                      <option value="0">—</option>
                      <option value="2">×2 Croque</option>
                      <option value="3">×3 Club</option>
                      <option value="pain">🍞 Pain</option>
                    </select>

                    {/* Couleur picker */}
                    <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setColorPickerFor(colorPickerFor === lp.id ? null : lp.id); }}
                        style={{ width: "24px", height: "24px", borderRadius: "50%", border: `2px solid ${couleur ?? "var(--border)"}`, background: couleur ?? "var(--bg-elev-2)", cursor: "pointer", flexShrink: 0 }}
                      />
                      {colorPickerFor === lp.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{ position: "absolute", top: "30px", left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", display: "grid", gridTemplateColumns: "repeat(4, 28px)", gap: "6px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
                        >
                          {COULEURS.map((c) => (
                            <button key={c.val} title={c.label} onClick={() => handleCouleur(lp.id, c.val)}
                              style={{ width: "28px", height: "28px", borderRadius: "50%", border: couleur === c.val ? "3px solid var(--text)" : "2px solid transparent", background: c.val, cursor: "pointer" }}
                            />
                          ))}
                          <button title="Aucune couleur" onClick={() => handleCouleur(lp.id, null)}
                            style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid var(--border)", background: "var(--bg-elev-2)", cursor: "pointer", fontSize: "12px", color: "var(--text-dim)" }}
                          >✕</button>
                        </div>
                      )}
                    </div>

                    {/* Cibles sem / sam */}
                    {TYPE_JOURS.map((tj) => {
                      const key = `${lp.id}-${tj}`;
                      const val = ciblesMap[lp.id]?.[tj] ?? "0";
                      return (
                        <input
                          key={key}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={val}
                          onChange={(e) => handleCible(lp.id, tj, e.target.value)}
                          style={{ width: "100%", padding: "4px", borderRadius: "5px", border: `1px solid ${savingCible[key] ? "var(--accent)" : "var(--border)"}`, background: "var(--bg-elev-2)", color: "var(--text)", fontSize: "13px", fontWeight: 500, textAlign: "center", outline: "none", transition: "border-color 0.15s" }}
                        />
                      );
                    })}

                    {/* Supprimer */}
                    <button
                      onClick={() => handleSupprimer(lp.id, cat.id, lp.nom)}
                      disabled={isPending}
                      title="Supprimer"
                      style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-faint)", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >🗑</button>
                  </div>
                );
              })}

              {/* Add product row */}
              {addingIn === cat.id ? (
                <div style={{ display: "flex", gap: "8px", padding: "6px 8px", alignItems: "center" }}>
                  <input
                    autoFocus
                    value={newNom}
                    onChange={(e) => setNewNom(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAjouter(cat.id); if (e.key === "Escape") { setAddingIn(null); setNewNom(""); } }}
                    placeholder="Nom du produit…"
                    style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--accent)", background: "var(--bg-elev-2)", color: "var(--text)", fontSize: "13px", outline: "none" }}
                  />
                  <button onClick={() => handleAjouter(cat.id)} disabled={isPending || !newNom.trim()} style={{ ...addBtnStyle, background: "var(--accent)", color: "white", opacity: newNom.trim() ? 1 : 0.5 }}>Ajouter</button>
                  <button onClick={() => { setAddingIn(null); setNewNom(""); }} style={addBtnStyle}>Annuler</button>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingIn(cat.id); setNewNom(""); }}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px", marginTop: "2px", borderRadius: "6px", border: "1px dashed var(--border)", background: "transparent", color: "var(--text-dim)", cursor: "pointer", fontSize: "12px", width: "100%" }}
                >
                  + Ajouter un produit dans {cat.nom}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em",
  textTransform: "uppercase", color: "var(--text-dim)",
  lineHeight: 1.3,
};

const addBtnStyle: React.CSSProperties = {
  padding: "5px 12px", borderRadius: "6px", border: "1px solid var(--border)",
  background: "var(--bg-elev-2)", color: "var(--text)", cursor: "pointer", fontSize: "13px",
};

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "3px 4px", borderRadius: "5px",
  border: "1px solid var(--border)", background: "var(--bg-elev-2)",
  color: "var(--text)", fontSize: "12px", cursor: "pointer",
};
