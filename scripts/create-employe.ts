import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import * as schema from "../lib/db/schema";

const email = process.env.EMPLOYE_EMAIL;
const password = process.env.EMPLOYE_PASSWORD;

if (!email || !password) {
  console.error("Usage: EMPLOYE_EMAIL=... EMPLOYE_PASSWORD=... npx tsx scripts/create-employe.ts");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error && !error.message.includes("already registered")) {
    console.error("Erreur création Supabase Auth :", error.message);
    process.exit(1);
  }

  if (data.user) {
    await db
      .insert(schema.users)
      .values({ id: data.user.id, email: email as string, nom: "Employé", role: "employe", lieuParDefaut: "ext" })
      .onConflictDoNothing();
    console.log(`✓ Compte employé créé : ${email}`);
  } else {
    console.log(`ℹ Compte existe déjà : ${email}`);
  }

  await client.end();
}

main();
