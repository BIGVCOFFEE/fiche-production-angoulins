import { db } from "@/lib/db";
import { categories, produits, cibles, saisiesSoir, cloturas, joursSpeciaux, parametres } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import FicheProduction from "./FicheProduction";

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

// When a closed Sunday is in the lookback window, also include the preceding Saturday
function withSundayNeighbour(dates: string[], openSundays: string[]): string[] {
  const extras = dates
    .filter((d) => new Date(d + "T12:00:00").getDay() === 0 && !openSundays.includes(d))
    .map((d) => {
      const dt = new Date(d + "T12:00:00");
      dt.setDate(dt.getDate() - 1);
      return dt.toISOString().slice(0, 10);
    });
  return [...new Set([...dates, ...extras])];
}

function getTypeJour(date: string): "sem" | "sam" | "dim" {
  const jour = new Date(date + "T12:00:00+02:00").getDay();
  return jour === 6 ? "sam" : jour === 0 ? "dim" : "sem";
}

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const allJoursSpeciaux = await db.select().from(joursSpeciaux);
  const specialDayMap: Record<string, "ferme" | "type_semaine" | "type_sam"> = {};
  for (const j of allJoursSpeciaux) specialDayMap[j.date] = j.type;
  const openSundays = allJoursSpeciaux
    .filter((j) => j.type !== "ferme" && new Date(j.date + "T12:00:00").getDay() === 0)
    .map((j) => j.date);

  const params = await searchParams;
  const date = params.date ?? getDateParis();
  const veille = dateOffset(date, -1);
  const demain = dateOffset(date, 1);
  const typeJour = getTypeJour(date);
  const typeJourDemain = getTypeJour(demain);

  const prods = await db
    .select({
      id: produits.id,
      nom: produits.nom,
      couleur: produits.couleur,
      dureeVie: produits.dureeVie,
      tranchesParUnite: produits.tranchesParUnite,
      estPain: produits.estPain,
      ordreAffichage: produits.ordreAffichage,
      categorieId: produits.categorieId,
      categorieNom: categories.nom,
      categorieEmoji: categories.emoji,
      categorieOrdre: categories.ordreAffichage,
      categorieEstPain: categories.estPain,
    })
    .from(produits)
    .innerJoin(categories, eq(produits.categorieId, categories.id))
    .where(eq(produits.actifAngoulins, true))
    .orderBy(categories.ordreAffichage, produits.ordreAffichage);

  const produitIds = prods.map((p) => p.id);
  const maxLookback = prods.length > 0 ? Math.max(...prods.map((p) => p.dureeVie)) / 24 : 1;
  // Expand with Saturday when a closed Sunday falls in the lookback window
  const lookbackDates = withSundayNeighbour(getLookbackDates(date, maxLookback), openSundays);

  const [
    ciblesAujourdhuiData,
    ciblesDemainData,
    allSaisies,
    cloturVeille,
    ratioRow,
  ] = await Promise.all([
    produitIds.length > 0
      ? db.select().from(cibles).where(
          and(eq(cibles.typeJour, typeJour), eq(cibles.lieu, "angoulins"), inArray(cibles.produitId, produitIds))
        )
      : [],
    produitIds.length > 0
      ? db.select().from(cibles).where(
          and(eq(cibles.typeJour, typeJourDemain), eq(cibles.lieu, "angoulins"), inArray(cibles.produitId, produitIds))
        )
      : [],
    produitIds.length > 0
      ? db.select().from(saisiesSoir).where(
          and(inArray(saisiesSoir.date, lookbackDates), eq(saisiesSoir.lieu, "angoulins"))
        )
      : [],
    db.select().from(cloturas).where(and(eq(cloturas.date, veille), eq(cloturas.lieu, "angoulins"))),
    db.select().from(parametres).where(eq(parametres.cle, "angoulins_ratio_lendemain")),
  ]);

  const typeSpecialAujourdhui = specialDayMap[date] ?? null;
  const estFerme =
    typeSpecialAujourdhui === "ferme" ||
    (typeJour === "dim" && typeSpecialAujourdhui !== "type_semaine" && typeSpecialAujourdhui !== "type_sam");

  const typeJourSpecialDemain = specialDayMap[demain] ?? null;
  const demainEstFerme =
    (typeJourDemain === "dim" && typeJourSpecialDemain !== "type_semaine" && typeJourSpecialDemain !== "type_sam") ||
    typeJourSpecialDemain === "ferme";

  const ratio = parseInt(ratioRow[0]?.valeur ?? "40", 10);

  const ciblesAujourdhuiMap: Record<number, number> = {};
  for (const c of ciblesAujourdhuiData) ciblesAujourdhuiMap[c.produitId] = c.quantite;

  const ciblesDemainMap: Record<number, number> = {};
  for (const c of ciblesDemainData) ciblesDemainMap[c.produitId] = c.quantite;

  const restantsMap: Record<string, Record<number, { quantite: number; conserveExtra: number | null }>> = {};
  for (const s of allSaisies) {
    restantsMap[s.date] ??= {};
    restantsMap[s.date][s.produitId] = { quantite: s.quantiteRestante, conserveExtra: s.conserveExtra };
  }

  const categoriesMap: Record<number, {
    id: number; nom: string; emoji: string | null; ordre: number; estPain: boolean;
    produits: {
      id: number; nom: string; couleur: string | null; conserveExtra: number | null;
      tranchesParUnite: number; estPain: boolean;
      cibleAujourdhui: number; cibleDemain: number; stockVeille: number;
      aProduire: number; bufferDemain: number;
    }[];
  }> = {};

  for (const p of prods) {
    const pLookbackDates = withSundayNeighbour(getLookbackDates(date, p.dureeVie / 24), openSundays);
    const cibleAujourdhui = ciblesAujourdhuiMap[p.id] ?? 0;
    const cibleDemain = demainEstFerme ? 0 : (ciblesDemainMap[p.id] ?? 0);
    // Use most recent saisie (avoids double-counting when J-1 restant=0 but J-2 still has old data)
    const veilleSaisieDate = pLookbackDates.find(d => restantsMap[d]?.[p.id] !== undefined);
    const stockBrut = veilleSaisieDate ? (restantsMap[veilleSaisieDate][p.id].quantite ?? 0) : 0;
    const conserveExtra = veilleSaisieDate ? (restantsMap[veilleSaisieDate][p.id].conserveExtra ?? null) : null;
    const stockVeille = stockBrut + (conserveExtra ?? 0);
    const baseAProduire = Math.max(0, cibleAujourdhui - stockVeille);
    const bufferDemain = Math.round(cibleDemain * ratio / 100);
    const aProduire = baseAProduire + bufferDemain;

    if (!categoriesMap[p.categorieId]) {
      categoriesMap[p.categorieId] = { id: p.categorieId, nom: p.categorieNom, emoji: p.categorieEmoji, ordre: p.categorieOrdre, estPain: p.categorieEstPain, produits: [] };
    }
    categoriesMap[p.categorieId].produits.push({
      id: p.id, nom: p.nom, couleur: p.couleur, conserveExtra,
      tranchesParUnite: p.tranchesParUnite, estPain: p.estPain,
      cibleAujourdhui, cibleDemain, stockVeille, aProduire, bufferDemain,
    });
  }

  const categoriesList = Object.values(categoriesMap)
    .filter((c) => c.produits.length > 0)
    .sort((a, b) => a.ordre - b.ordre);

  return (
    <FicheProduction
      date={date}
      demain={demain}
      typeJour={typeJour}
      veille={veille}
      categories={categoriesList}
      veilleEstCloturee={cloturVeille.length > 0}
      estFerme={estFerme}
      demainEstFerme={demainEstFerme}
      ratio={ratio}
      openSundays={openSundays}
    />
  );
}
