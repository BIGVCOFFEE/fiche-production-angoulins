"use server";
import { db } from "@/lib/db";
import { parametres } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

export async function setRatioLendemain(ratio: number) {
  const val = Math.max(0, Math.min(100, Math.round(ratio)));
  await db
    .insert(parametres)
    .values({ cle: "angoulins_ratio_lendemain", valeur: String(val) })
    .onConflictDoUpdate({
      target: parametres.cle,
      set: { valeur: String(val) },
    });
  revalidatePath("/production");
}
