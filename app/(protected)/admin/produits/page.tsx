import { db } from "@/lib/db";
import { categories, produits, cibles, parametres } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import AdminProduits from "./AdminProduits";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/role";
import { redirect } from "next/navigation";

const LIEU = "angoulins" as const;

export default async function AdminProduitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || await getUserRole(user.id) !== "admin") redirect("/aujourdhui");

  const [prods, ciblesData, toutesLesCategories, ratioRow, vendrediSamRow] = await Promise.all([
    db
      .select({
        id: produits.id,
        nom: produits.nom,
        actifAngoulins: produits.actifAngoulins,
        couleur: produits.couleur,
        dureeVie: produits.dureeVie,
        tranchesParUnite: produits.tranchesParUnite,
        estPain: produits.estPain,
        ordreAffichage: produits.ordreAffichage,
        categorieId: produits.categorieId,
        categorieNom: categories.nom,
        categorieEmoji: categories.emoji,
        categorieOrdre: categories.ordreAffichage,
      })
      .from(produits)
      .innerJoin(categories, eq(produits.categorieId, categories.id))
      .orderBy(categories.ordreAffichage, produits.ordreAffichage),
    db.select().from(cibles).where(eq(cibles.lieu, LIEU)),
    db.select().from(categories).orderBy(categories.ordreAffichage),
    db.select().from(parametres).where(eq(parametres.cle, "angoulins_ratio_lendemain")),
    db.select().from(parametres).where(eq(parametres.cle, "angoulins_vendredi_sam")),
  ]);

  const ciblesMap: Record<number, Record<string, number>> = {};
  for (const c of ciblesData) {
    ciblesMap[c.produitId] ??= {};
    ciblesMap[c.produitId][c.typeJour] = c.quantite;
  }

  const categoriesMap: Record<number, {
    id: number; nom: string; emoji: string | null; ordre: number;
    produits: {
      id: number; nom: string; actifAngoulins: boolean; couleur: string | null;
      dureeVie: number; tranchesParUnite: number; estPain: boolean;
      cibles: Record<string, number>;
    }[];
  }> = {};

  for (const p of prods) {
    categoriesMap[p.categorieId] ??= { id: p.categorieId, nom: p.categorieNom, emoji: p.categorieEmoji, ordre: p.categorieOrdre, produits: [] };
    categoriesMap[p.categorieId].produits.push({
      id: p.id, nom: p.nom, actifAngoulins: p.actifAngoulins,
      couleur: p.couleur, dureeVie: p.dureeVie,
      tranchesParUnite: p.tranchesParUnite, estPain: p.estPain,
      cibles: ciblesMap[p.id] ?? {},
    });
  }

  for (const c of toutesLesCategories) {
    categoriesMap[c.id] ??= { id: c.id, nom: c.nom, emoji: c.emoji, ordre: c.ordreAffichage, produits: [] };
  }

  const categoriesList = Object.values(categoriesMap).sort((a, b) => a.ordre - b.ordre);
  const ratio = parseInt(ratioRow[0]?.valeur ?? "40", 10);
  const vendrediSam = vendrediSamRow[0]?.valeur === "true";

  return <AdminProduits categories={categoriesList} ratio={ratio} vendrediSam={vendrediSam} />;
}
