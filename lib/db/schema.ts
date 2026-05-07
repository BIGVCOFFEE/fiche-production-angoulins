import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  serial,
  uuid,
  varchar,
  boolean,
  integer,
  jsonb,
  date,
  timestamp,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "manager", "employe"]);
export const lieuEnum = pgEnum("lieu", ["ext", "kiosque", "angoulins"]);
export const typeJourEnum = pgEnum("type_jour", ["sem", "sam", "dim"]);
export const typeJourSpecialEnum = pgEnum("type_jour_special", ["ferme", "type_semaine", "type_sam"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  nom: varchar("nom", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("employe"),
  lieuParDefaut: lieuEnum("lieu_par_defaut").notNull().default("ext"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  nom: varchar("nom", { length: 100 }).notNull(),
  emoji: varchar("emoji", { length: 10 }),
  icone: varchar("icone", { length: 50 }),
  ordreAffichage: integer("ordre_affichage").notNull().default(0),
  groupe: integer("groupe").notNull().default(2),
  estPain: boolean("est_pain").notNull().default(false),
});

export const produits = pgTable("produits", {
  id: serial("id").primaryKey(),
  categorieId: integer("categorie_id")
    .notNull()
    .references(() => categories.id),
  nom: varchar("nom", { length: 255 }).notNull(),
  actif: boolean("actif").notNull().default(true),
  ordreAffichage: integer("ordre_affichage").notNull().default(0),
  prixRevientCentimes: integer("prix_revient_centimes"),
  consommationPain: jsonb("consommation_pain"),
  couleur: varchar("couleur", { length: 20 }),
  dureeVie: integer("duree_vie").notNull().default(48),
  tranchesParUnite: integer("tranches_par_unite").notNull().default(0),
  estPain: boolean("est_pain").notNull().default(false),
});

export const cibles = pgTable(
  "cibles",
  {
    produitId: integer("produit_id")
      .notNull()
      .references(() => produits.id),
    typeJour: typeJourEnum("type_jour").notNull(),
    lieu: lieuEnum("lieu").notNull(),
    quantite: integer("quantite").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.produitId, t.typeJour, t.lieu] })]
);

export const saisiesSoir = pgTable(
  "saisies_soir",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    produitId: integer("produit_id")
      .notNull()
      .references(() => produits.id),
    lieu: lieuEnum("lieu").notNull(),
    quantiteRestante: integer("quantite_restante").notNull().default(0),
    saisiePar: uuid("saisie_par").references(() => users.id),
    saisieA: timestamp("saisie_a").notNull().defaultNow(),
    modifieA: timestamp("modifie_a").notNull().defaultNow(),
    conserveExtra: integer("conserve_extra"),
  },
  (t) => [
    unique().on(t.date, t.produitId, t.lieu),
    index("idx_saisies_date_lieu").on(t.date, t.lieu),
  ]
);

export const cloturas = pgTable(
  "cloturas",
  {
    date: date("date").notNull(),
    lieu: lieuEnum("lieu").notNull(),
    cloturePar: uuid("cloture_par").references(() => users.id),
    clotureA: timestamp("cloture_a").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.date, t.lieu] })]
);

export const parametres = pgTable("parametres", {
  cle: varchar("cle", { length: 100 }).primaryKey(),
  valeur: varchar("valeur", { length: 255 }).notNull(),
});

export const joursSpeciaux = pgTable("jours_speciaux", {
  date: date("date").primaryKey(),
  type: typeJourSpecialEnum("type").notNull(),
  note: varchar("note", { length: 255 }),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  ligneId: varchar("ligne_id", { length: 100 }),
  ancien: jsonb("ancien"),
  nouveau: jsonb("nouveau"),
  ts: timestamp("ts").notNull().defaultNow(),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  produits: many(produits),
}));

export const produitsRelations = relations(produits, ({ one, many }) => ({
  categorie: one(categories, { fields: [produits.categorieId], references: [categories.id] }),
  cibles: many(cibles),
  saisiesSoir: many(saisiesSoir),
}));

export const ciblesRelations = relations(cibles, ({ one }) => ({
  produit: one(produits, { fields: [cibles.produitId], references: [produits.id] }),
}));

export const saisiesSoirRelations = relations(saisiesSoir, ({ one }) => ({
  produit: one(produits, { fields: [saisiesSoir.produitId], references: [produits.id] }),
  saisiePar: one(users, { fields: [saisiesSoir.saisiePar], references: [users.id] }),
}));
