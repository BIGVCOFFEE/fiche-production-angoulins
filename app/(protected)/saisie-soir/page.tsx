import { db } from "@/lib/db";
import { categories, produits, cibles, saisiesSoir, cloturas } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import SaisieSoir from "./SaisieSoir";

const LIEU = "angoulins" as const;

function getDateParis() {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateMoins1(date: string) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default async function SaisieSoirPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date ?? getDateParis();
  const veille = dateMoins1(date);
  const jourSemaine = new Date(date + "T12:00:00+02:00").getDay();
  const typeJour = jourSemaine === 6 ? "sam" : jourSemaine === 0 ? "dim" : "sem";

  const prods = await db
    .select({
      id: produits.id,
      nom: produits.nom,
      couleur: produits.couleur,
      ordreAffichage: produits.ordreAffichage,
      categorieId: produits.categorieId,
      categorieNom: categories.nom,
      categorieEmoji: categories.emoji,
      categorieOrdre: categories.ordreAffichage,
    })
    .from(produits)
    .innerJoin(categories, eq(produits.categorieId, categories.id))
    .where(eq(produits.actif, true))
    .orderBy(categories.ordreAffichage, produits.ordreAffichage);

  const produitIds = prods.map((p) => p.id);

  const [ciblesData, saisiesData, saisiesVeille, clotureRows] = await Promise.all([
    produitIds.length > 0
      ? db.select().from(cibles).where(and(eq(cibles.lieu, LIEU), inArray(cibles.produitId, produitIds)))
      : [],
    produitIds.length > 0
      ? db.select().from(saisiesSoir).where(and(eq(saisiesSoir.date, date), eq(saisiesSoir.lieu, LIEU)))
      : [],
    produitIds.length > 0
      ? db.select().from(saisiesSoir).where(and(eq(saisiesSoir.date, veille), eq(saisiesSoir.lieu, LIEU)))
      : [],
    db.select().from(cloturas).where(and(eq(cloturas.date, date), eq(cloturas.lieu, LIEU))),
  ]);

  const isCloture = clotureRows.length > 0;

  const ciblesMap: Record<number, Record<string, number>> = {};
  for (const c of ciblesData) {
    ciblesMap[c.produitId] ??= {};
    ciblesMap[c.produitId][c.typeJour] = c.quantite;
  }

  const saisiesMap: Record<number, number> = {};
  const conserveExtraMap: Record<number, number | null> = {};
  for (const s of saisiesData) {
    saisiesMap[s.produitId] = s.quantiteRestante;
    conserveExtraMap[s.produitId] = s.conserveExtra;
  }

  const alertsProlong: Record<number, number> = {};
  for (const s of saisiesVeille) {
    if (s.conserveExtra && s.conserveExtra > 0) alertsProlong[s.produitId] = s.conserveExtra;
  }

  const categoriesMap: Record<number, {
    id: number; nom: string; emoji: string | null; ordre: number;
    produits: { id: number; nom: string; couleur: string | null; ordre: number; cible: number; restant: number | null; conserveExtra: number | null }[];
  }> = {};

  for (const p of prods) {
    categoriesMap[p.categorieId] ??= { id: p.categorieId, nom: p.categorieNom, emoji: p.categorieEmoji, ordre: p.categorieOrdre, produits: [] };
    categoriesMap[p.categorieId].produits.push({
      id: p.id, nom: p.nom, couleur: p.couleur, ordre: p.ordreAffichage,
      cible: ciblesMap[p.id]?.[typeJour] ?? 0,
      restant: saisiesMap[p.id] ?? null,
      conserveExtra: conserveExtraMap[p.id] ?? null,
    });
  }

  const categoriesList = Object.values(categoriesMap).sort((a, b) => a.ordre - b.ordre);

  return (
    <SaisieSoir
      key={date}
      date={date}
      typeJour={typeJour}
      categories={categoriesList}
      isCloture={isCloture}
      alertsProlong={alertsProlong}
    />
  );
}
