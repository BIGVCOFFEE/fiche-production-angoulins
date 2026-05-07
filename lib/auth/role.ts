import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUserRole(userId: string): Promise<"admin" | "employe"> {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return u?.role === "admin" ? "admin" : "employe";
}
