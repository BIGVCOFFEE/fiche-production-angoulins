"use server";

import { db } from "@/lib/db";
import { cibles } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserRole } from "@/lib/auth/role";

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
