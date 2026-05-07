import { db } from "@/lib/db";
import { categories, produits, cibles, saisiesSoir, cloturas, joursSpeciaux } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import FicheMatin from "./FicheMatin";

const LIEU = "angoulins" as const;

function getDateParis() {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateOffset(date: string, delta: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function getLookbackDates(date: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => dateOffset(date, -(i + 1)));
}

function getTypeJour(date: string): "sem" | "sam" | "dim" {
  const jour = new Date(date + "T12:00:00+02:00").getDay();
  return jour === 6 ? "sam" : jour === 0 ? "dim" : "sem";
}

export default async function AujourdhuiPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date ?? getDateParis();
  const veille = dateOffset(date, -1);
  const typeJour = getTypeJour(date);

  const prods = await db
    .select({
      id: produits.id,
      nom: produits.nom,
      couleur: produits.couleur,
      dureeVie: produits.dureeVie,
      ordreAffichage: produits.ordreAffichage,
      categorieId: produits.categorieId,
      categorieNom: categories.nom,
      categorieEmoji: categories.emoji,
      categorieOrdre: categories.ordreAffichage,
    })
    .from(produits)
    .innerJoin(categories, eq(produits.categorieId, categories.id))
    .where(eq(produits.actifAngoulins, true))
    .orderBy(categories.ordreAffichage, produits.ordreAffichage);

  const produitIds = prods.map((p) => p.id);
  const maxLookback = prods.length > 0 ? Math.max(...prods.map((p) => p.dureeVie)) / 24 : 1;
  const lookbackDates = getLookbackDates(date, maxLookback);

  const [ciblesData, allSaisies, clotureVeille, jourSpecialRows] = await Promise.all([
    produitIds.length > 0
      ? db.select().from(cibles).where(
          and(eq(cibles.lieu, LIEU), eq(cibles.typeJour, typeJour), inArray(cibles.produitId, produitIds))
        )
      : [],
    produitIds.length > 0
      ? db.select().from(saisiesSoir).where(
          and(inArray(saisiesSoir.date, lookbackDates), eq(saisiesSoir.lieu, LIEU))
        )
      : [],
    db.select().from(cloturas).where(and(eq(cloturas.date, veille), eq(cloturas.lieu, LIEU))),
    db.select().from(joursSpeciaux).where(eq(joursSpeciaux.date, date)),
  ]);

  const estFerme = jourSpecialRows[0]?.type === "ferme";

  const ciblesMap: Record<number, number> = {};
  for (const c of ciblesData) ciblesMap[c.produitId] = c.quantite;

  type SaisieData = { quantite: number; conserveExtra: number | null };
  const restantsMap: Record<string, Record<number, SaisieData>> = {};
  for (const s of allSaisies) {
    restantsMap[s.date] ??= {};
    restantsMap[s.date][s.produitId] = { quantite: s.quantiteRestante, conserveExtra: s.conserveExtra };
  }

  const categoriesMap: Record<number, {
    id: number; nom: string; emoji: string | null; ordre: number;
    produits: { id: number; nom: string; couleur: string | null; cible: number; restantVeille: number | null; conserveExtra: number | null; aProduire: number }[];
  }> = {};

  for (const p of prods) {
    const cible = ciblesMap[p.id] ?? 0;
    const pLookbackDates = getLookbackDates(date, p.dureeVie / 24);
    const restantVeille = restantsMap[veille]?.[p.id]?.quantite ?? null;
    const conserveExtra = restantsMap[veille]?.[p.id]?.conserveExtra ?? null;
    const stock = pLookbackDates.reduce((sum, d) => sum + (restantsMap[d]?.[p.id]?.quantite ?? 0), 0);
    const effectiveStock = stock + (conserveExtra ?? 0);
    const aProduire = Math.max(0, cible - effectiveStock);

    categoriesMap[p.categorieId] ??= { id: p.categorieId, nom: p.categorieNom, emoji: p.categorieEmoji, ordre: p.categorieOrdre, produits: [] };
    categoriesMap[p.categorieId].produits.push({ id: p.id, nom: p.nom, couleur: p.couleur, cible, restantVeille, conserveExtra, aProduire });
  }

  const categoriesList = Object.values(categoriesMap)
    .filter((c) => c.produits.length > 0)
    .sort((a, b) => a.ordre - b.ordre);

  return (
    <FicheMatin
      date={date}
      typeJour={typeJour}
      veille={veille}
      categories={categoriesList}
      veilleEstCloturee={clotureVeille.length > 0}
      estFerme={estFerme}
    />
  );
}
