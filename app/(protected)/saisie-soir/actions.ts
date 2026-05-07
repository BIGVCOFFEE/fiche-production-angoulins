"use server";

import { db } from "@/lib/db";
import { saisiesSoir, cloturas } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

const LIEU = "angoulins" as const;

export async function upsertSaisie(date: string, produitId: number, quantiteRestante: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await db
    .insert(saisiesSoir)
    .values({ date, produitId, lieu: LIEU, quantiteRestante, saisiePar: user.id })
    .onConflictDoUpdate({
      target: [saisiesSoir.date, saisiesSoir.produitId, saisiesSoir.lieu],
      set: { quantiteRestante, saisiePar: user.id, modifieA: new Date() },
    });

  revalidatePath("/saisie-soir");
}

export async function cloturerJournee(date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await db
    .insert(cloturas)
    .values({ date, lieu: LIEU, cloturePar: user.id })
    .onConflictDoUpdate({
      target: [cloturas.date, cloturas.lieu],
      set: { cloturePar: user.id, clotureA: new Date() },
    });

  revalidatePath("/saisie-soir");
}

export async function setConserveExtra(date: string, produitId: number, conserveExtra: number | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await db
    .insert(saisiesSoir)
    .values({ date, produitId, lieu: LIEU, quantiteRestante: 0, saisiePar: user.id, conserveExtra })
    .onConflictDoUpdate({
      target: [saisiesSoir.date, saisiesSoir.produitId, saisiesSoir.lieu],
      set: { conserveExtra, modifieA: new Date() },
    });

  revalidatePath("/saisie-soir");
}

export async function decloturerJournee(date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await db.delete(cloturas).where(and(eq(cloturas.date, date), eq(cloturas.lieu, LIEU)));
  revalidatePath("/saisie-soir");
}
