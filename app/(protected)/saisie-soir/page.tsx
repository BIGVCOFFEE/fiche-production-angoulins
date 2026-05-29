import { db } from "@/lib/db";
import { categories, produits, cibles, saisiesSoir, cloturas, joursSpeciaux } from "@/lib/db/schema";
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

function dateMinusDays(date: string, days: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// If expiry date falls on a closed Sunday, shift back to Saturday
function skipIfSunday(date: string, openSundays: string[]): string {
  if (new Date(date + "T12:00:00").getDay() === 0 && !openSundays.includes(date)) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  return date;
}

export default async function SaisieSoirPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const allJoursSpeciaux = await db.select().from(joursSpeciaux);
  const openSundays = allJoursSpeciaux
    .filter((j) => j.type !== "ferme" && new Date(j.date + "T12:00:00").getDay() === 0)
    .map((j) => j.date);

  const params = await searchParams;
  const date = params.date ?? getDateParis();
  const veille = dateMoins1(date);
  // If veille is a closed Sunday, use Saturday for prolongation alerts + conserveExtra
  const conserveVeille = (new Date(veille + "T12:00:00").getDay() === 0 && !openSundays.includes(veille))
    ? dateMoins1(veille)
    : veille;
  const jourSemaine = new Date(date + "T12:00:00+02:00").getDay();
  const typeJour = jourSemaine === 6 ? "sam" : jourSemaine === 0 ? "dim" : "sem";

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

  // Décalage "à jeter" = DLC/24 − 1 jours.
  // Un produit fabriqué le jour J périme à J + DLC ; il faut le jeter à la
  // DERNIÈRE fermeture avant péremption, soit le soir de J + (DLC/24 − 1).
  // Ex : 48h fabriqué lundi → périme mercredi matin → jeté mardi soir (offset 1).
  //      24h → jeté le soir même (offset 0). 72h → +2 jours.
  const expiryOffset = (dureeVie: number) => Math.max(0, Math.round(dureeVie / 24) - 1);

  // Skip closed Sundays (no saisie) → use Saturday instead
  const expiryDates = [...new Set(
    prods.map((p) => skipIfSunday(dateMinusDays(date, expiryOffset(p.dureeVie)), openSundays))
  )];

  const [ciblesData, saisiesData, saisiesVeille, saisiesExpiry, clotureRows] = await Promise.all([
    produitIds.length > 0
      ? db.select().from(cibles).where(and(eq(cibles.lieu, LIEU), inArray(cibles.produitId, produitIds)))
      : [],
    produitIds.length > 0
      ? db.select().from(saisiesSoir).where(and(eq(saisiesSoir.date, date), eq(saisiesSoir.lieu, LIEU)))
      : [],
    produitIds.length > 0
      ? db.select().from(saisiesSoir).where(and(eq(saisiesSoir.date, conserveVeille), eq(saisiesSoir.lieu, LIEU)))
      : [],
    produitIds.length > 0
      ? db.select().from(saisiesSoir).where(and(inArray(saisiesSoir.date, expiryDates), eq(saisiesSoir.lieu, LIEU)))
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
  const veilleConserveExtraMap: Record<number, number> = {};
  for (const s of saisiesVeille) {
    if (s.conserveExtra && s.conserveExtra > 0) {
      alertsProlong[s.produitId] = s.conserveExtra;
      veilleConserveExtraMap[s.produitId] = s.conserveExtra;
    }
  }

  const expiryMap: Record<string, Record<number, number>> = {};
  for (const s of saisiesExpiry) {
    expiryMap[s.date] ??= {};
    expiryMap[s.date][s.produitId] = s.quantiteRestante;
  }

  const categoriesMap: Record<number, {
    id: number; nom: string; emoji: string | null; ordre: number;
    produits: { id: number; nom: string; couleur: string | null; ordre: number; cible: number; restant: number | null; conserveExtra: number | null; aJeter: number }[];
  }> = {};

  for (const p of prods) {
    categoriesMap[p.categorieId] ??= { id: p.categorieId, nom: p.categorieNom, emoji: p.categorieEmoji, ordre: p.categorieOrdre, produits: [] };
    categoriesMap[p.categorieId].produits.push({
      id: p.id, nom: p.nom, couleur: p.couleur, ordre: p.ordreAffichage,
      cible: ciblesMap[p.id]?.[typeJour] ?? 0,
      restant: saisiesMap[p.id] ?? null,
      conserveExtra: conserveExtraMap[p.id] ?? null,
      aJeter: (expiryMap[skipIfSunday(dateMinusDays(date, expiryOffset(p.dureeVie)), openSundays)]?.[p.id] ?? 0) +
              (veilleConserveExtraMap[p.id] ?? 0),
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
      openSundays={openSundays}
    />
  );
}
