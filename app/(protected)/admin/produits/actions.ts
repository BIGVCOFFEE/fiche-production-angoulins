"use server";

import { db } from "@/lib/db";
import { cibles, produits, saisiesSoir, parametres } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserRole } from "@/lib/auth/role";
import { eq, count } from "drizzle-orm";

const LIEU = "angoulins" as const;

async function authCheck() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  if (await getUserRole(user.id) !== "admin") throw new Error("Accès refusé");
  return user;
}

export async function updateCible(
  produitId: number,
  typeJour: "sem" | "sam" | "dim",
  quantite: number
) {
  await authCheck();
  await db
    .insert(cibles)
    .values({ produitId, typeJour, lieu: LIEU, quantite })
    .onConflictDoUpdate({
      target: [cibles.produitId, cibles.typeJour, cibles.lieu],
      set: { quantite },
    });
  revalidatePath("/admin/produits");
}

export async function toggleActifAngoulins(produitId: number, actif: boolean) {
  await authCheck();
  await db.update(produits).set({ actifAngoulins: actif }).where(eq(produits.id, produitId));
  revalidatePath("/admin/produits");
}

export async function updateCouleur(produitId: number, couleur: string | null) {
  await authCheck();
  await db.update(produits).set({ couleur }).where(eq(produits.id, produitId));
  revalidatePath("/admin/produits");
}

export async function updateDureeVie(produitId: number, dureeVie: number) {
  await authCheck();
  await db.update(produits).set({ dureeVie }).where(eq(produits.id, produitId));
  revalidatePath("/admin/produits");
}

export async function updateTranchesParUnite(produitId: number, tranches: number) {
  await authCheck();
  await db.update(produits).set({ tranchesParUnite: tranches }).where(eq(produits.id, produitId));
  revalidatePath("/admin/produits");
}

export async function updateEstPainProduit(produitId: number, estPain: boolean) {
  await authCheck();
  await db.update(produits).set({ estPain }).where(eq(produits.id, produitId));
  revalidatePath("/admin/produits");
}

export async function ajouterProduit(categorieId: number, nom: string) {
  await authCheck();
  const trimmed = nom.trim();
  if (!trimmed) throw new Error("Nom requis");

  const existing = await db
    .select({ ordre: produits.ordreAffichage })
    .from(produits)
    .where(eq(produits.categorieId, categorieId));
  const maxOrdre = existing.length ? Math.max(...existing.map((p) => p.ordre)) : 0;

  const [newProduit] = await db
    .insert(produits)
    .values({
      categorieId,
      nom: trimmed,
      actif: false,
      actifAngoulins: true,
      ordreAffichage: maxOrdre + 1,
    })
    .returning({ id: produits.id });

  await db.insert(cibles).values([
    { produitId: newProduit.id, lieu: LIEU, typeJour: "sem", quantite: 0 },
    { produitId: newProduit.id, lieu: LIEU, typeJour: "sam", quantite: 0 },
  ]);

  revalidatePath("/admin/produits");
  return newProduit.id;
}

export async function renommerProduit(produitId: number, nom: string) {
  await authCheck();
  const trimmed = nom.trim();
  if (!trimmed) throw new Error("Nom requis");
  await db.update(produits).set({ nom: trimmed }).where(eq(produits.id, produitId));
  revalidatePath("/admin/produits");
}

export async function supprimerProduit(produitId: number) {
  await authCheck();

  const [{ nb }] = await db
    .select({ nb: count() })
    .from(saisiesSoir)
    .where(eq(saisiesSoir.produitId, produitId));

  if (Number(nb) > 0) {
    throw new Error("Ce produit a des saisies enregistrées — désactivez-le plutôt que de le supprimer.");
  }

  await db.delete(cibles).where(eq(cibles.produitId, produitId));
  await db.delete(produits).where(eq(produits.id, produitId));
  revalidatePath("/admin/produits");
}

export async function setVendrediSam(enabled: boolean) {
  await authCheck();
  await db
    .insert(parametres)
    .values({ cle: "angoulins_vendredi_sam", valeur: enabled ? "true" : "false" })
    .onConflictDoUpdate({ target: parametres.cle, set: { valeur: enabled ? "true" : "false" } });
  revalidatePath("/admin/produits");
  revalidatePath("/production");
}

export async function setRatioLendemain(ratio: number) {
  await authCheck();
  const val = Math.max(0, Math.min(100, Math.round(ratio)));
  await db
    .insert(parametres)
    .values({ cle: "angoulins_ratio_lendemain", valeur: String(val) })
    .onConflictDoUpdate({ target: parametres.cle, set: { valeur: String(val) } });
  revalidatePath("/admin/produits");
  revalidatePath("/production");
}
