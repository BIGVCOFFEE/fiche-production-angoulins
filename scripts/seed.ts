import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import * as schema from "../lib/db/schema";
import seedData from "../seed-recettes.json";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Mapping emoji → Lucide icon name + nom normalisé
const CATEGORY_MAP: Record<string, { nom: string; emoji: string; icone: string }> = {
  "CLUBS & TOASTS": { nom: "Clubs & Toasts", emoji: "🥪", icone: "Sandwich" },
  "FOCACCIA": { nom: "Focaccia", emoji: "🫓", icone: "Square" },
  "TOAST & CROQUE": { nom: "Toast & Croque", emoji: "🍞", icone: "Flame" },
  "BUN BRIOCHE": { nom: "Bun Brioche", emoji: "🥐", icone: "CircleDot" },
  "CIABATTA": { nom: "Ciabatta", emoji: "🥙", icone: "AlignJustify" },
  "BAGEL": { nom: "Bagel", emoji: "🥯", icone: "Circle" },
  "SALADES & BOWLS": { nom: "Salades & Bowls", emoji: "🥗", icone: "Salad" },
  "POTS FRAIS": { nom: "Pots Frais", emoji: "🍓", icone: "Droplets" },
  "COOKIES": { nom: "Cookies", emoji: "🍪", icone: "Cookie" },
  "VIENNOISERIES": { nom: "Viennoiseries", emoji: "🥐", icone: "Croissant" },
  "DECONGEL": { nom: "Décongel", emoji: "🥞", icone: "Snowflake" },
  "CARRES & GATEAUX": { nom: "Carrés & Gâteaux", emoji: "🟫", icone: "Slice" },
  "DONUTS (FSP)": { nom: "Donuts", emoji: "🍩", icone: "Donut" },
  // Sous-catégories muffins
  "MUFFINS CHOCOLATS": { nom: "Muffins Chocolats", emoji: "🧁", icone: "Cake" },
  "MUFFINS CHOCO-FRUITÉES": { nom: "Muffins Choco-Fruités", emoji: "🧁", icone: "Cherry" },
  "MUFFINS CŒURS": { nom: "Muffins Cœurs", emoji: "🧁", icone: "Heart" },
  "MUFFINS FRUITÉS": { nom: "Muffins Fruités", emoji: "🧁", icone: "Apple" },
  "MUFFINS DOUBLE GOURMANDISE": { nom: "Muffins Double Gourmandise", emoji: "🧁", icone: "Star" },
  "MUFFINS SAISONNIER": { nom: "Muffins Saisonnier", emoji: "🧁", icone: "Leaf" },
};

// Mots-clés pour fruits (sans choco)
const FRUIT_KEYWORDS = ["framboise", "framboises", "banane", "pistache", "poire", "myrtille", "griotte", "fruits rouges", "fleur d'oranger", "ananas", "pomme", "citron"];
const CHOCO_KEYWORDS = ["chocolat", "choco", "brownie", "pepite", "pépite", "rocher", "marbr"];

function classifyMuffin(nom: string): string {
  const n = nom.toLowerCase();

  // Cœurs : contient "cœur" ou "coeur"
  if (n.includes("cœur") || n.includes("coeur") || n.includes("cheesecake")) {
    return "MUFFINS CŒURS";
  }

  const hasChoco = CHOCO_KEYWORDS.some((k) => n.includes(k));
  const hasFruit = FRUIT_KEYWORDS.some((k) => n.includes(k));

  if (hasChoco && hasFruit) return "MUFFINS CHOCO-FRUITÉES";
  if (hasFruit) return "MUFFINS FRUITÉS";
  if (hasChoco) return "MUFFINS CHOCOLATS";

  return "MUFFINS SAISONNIER";
}

function normalizeCategoryKey(raw: string): string {
  // Strip emoji prefix (non-ASCII chars at start)
  return raw.replace(/^[^\w\s]+\s*/u, "").toUpperCase().trim();
}

async function main() {
  console.log("🌱 Démarrage du seed…");

  // ── 1. Identifier les catégories uniques ─────────────────────────
  const categoryOrder: string[] = [];
  const categoryKeys = new Set<string>();

  for (const row of seedData) {
    const key = normalizeCategoryKey(row.categorie);
    if (key === "MUFFINS") continue; // éclatée plus bas
    if (!categoryKeys.has(key)) {
      categoryKeys.add(key);
      categoryOrder.push(key);
    }
  }

  // Ajouter les 6 sous-catégories muffins (dans l'ordre)
  const muffinSubCats = [
    "MUFFINS CHOCOLATS",
    "MUFFINS CHOCO-FRUITÉES",
    "MUFFINS CŒURS",
    "MUFFINS FRUITÉS",
    "MUFFINS DOUBLE GOURMANDISE",
    "MUFFINS SAISONNIER",
  ];
  muffinSubCats.forEach((k) => categoryOrder.push(k));

  // ── 2. Insérer les catégories ─────────────────────────────────────
  console.log(`  Insertion de ${categoryOrder.length} catégories…`);
  const catIdByKey: Record<string, number> = {};

  for (let i = 0; i < categoryOrder.length; i++) {
    const key = categoryOrder[i];
    const meta = CATEGORY_MAP[key];
    if (!meta) {
      console.warn(`  ⚠ Catégorie inconnue : ${key}`);
      continue;
    }
    const [inserted] = await db
      .insert(schema.categories)
      .values({ nom: meta.nom, emoji: meta.emoji, icone: meta.icone, ordreAffichage: i })
      .onConflictDoNothing()
      .returning({ id: schema.categories.id });

    // Si déjà existant, récupérer l'id
    if (inserted) {
      catIdByKey[key] = inserted.id;
    } else {
      const existing = await db.query.categories.findFirst({
        where: (c, { eq }) => eq(c.nom, meta.nom),
      });
      if (existing) catIdByKey[key] = existing.id;
    }
  }

  // ── 3. Insérer les produits + cibles ─────────────────────────────
  const orderByCategory: Record<string, number> = {};
  let totalProduits = 0;

  for (const row of seedData) {
    const rawKey = normalizeCategoryKey(row.categorie);
    const key = rawKey === "MUFFINS" ? classifyMuffin(row.produit) : rawKey;
    const catId = catIdByKey[key];

    if (!catId) {
      console.warn(`  ⚠ Cat ID introuvable pour : ${key} / ${row.produit}`);
      continue;
    }

    const ordre = orderByCategory[key] ?? 0;
    orderByCategory[key] = ordre + 1;

    const [prod] = await db
      .insert(schema.produits)
      .values({
        categorieId: catId,
        nom: row.produit,
        actif: true,
        ordreAffichage: ordre,
      })
      .onConflictDoNothing()
      .returning({ id: schema.produits.id });

    if (!prod) continue;
    totalProduits++;

    const ciblesData = [
      { typeJour: "sem" as const, lieu: "ext" as const, quantite: row.ext_sem },
      { typeJour: "sem" as const, lieu: "kiosque" as const, quantite: row.kiosque_sem },
      { typeJour: "sam" as const, lieu: "ext" as const, quantite: row.ext_sam },
      { typeJour: "sam" as const, lieu: "kiosque" as const, quantite: row.kiosque_sam },
      { typeJour: "dim" as const, lieu: "ext" as const, quantite: row.ext_dim },
      { typeJour: "dim" as const, lieu: "kiosque" as const, quantite: row.kiosque_dim },
    ];

    await db
      .insert(schema.cibles)
      .values(ciblesData.map((c) => ({ produitId: prod.id, ...c, quantite: Math.round(c.quantite) })))
      .onConflictDoNothing();
  }

  console.log(`  ✓ ${totalProduits} produits insérés`);

  // ── 4. Paramètres ─────────────────────────────────────────────────
  await db
    .insert(schema.parametres)
    .values([
      { cle: "sachets_par_boite", valeur: "24" },
      { cle: "muffins_par_plaque", valeur: "24" },
    ])
    .onConflictDoNothing();

  console.log("  ✓ Paramètres insérés");

  // ── 5. User admin ─────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL!;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD!;

  if (adminEmail && adminPassword) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (error && !error.message.includes("already registered")) {
      console.error("  ✗ Erreur création admin :", error.message);
    } else if (data.user) {
      await db
        .insert(schema.users)
        .values({
          id: data.user.id,
          email: adminEmail,
          nom: "Admin",
          role: "admin",
          lieuParDefaut: "ext",
        })
        .onConflictDoNothing();
      console.log(`  ✓ User admin créé : ${adminEmail}`);
    } else {
      console.log(`  ℹ User admin existe déjà : ${adminEmail}`);
    }
  }

  console.log("🎉 Seed terminé !");
  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
