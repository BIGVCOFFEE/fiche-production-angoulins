import { pgTable, varchar, unique, uuid, timestamp, foreignKey, serial, jsonb, integer, index, date, boolean, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const lieu = pgEnum("lieu", ['ext', 'kiosque'])
export const role = pgEnum("role", ['admin', 'manager', 'employe'])
export const typeJour = pgEnum("type_jour", ['sem', 'sam', 'dim'])
export const typeJourSpecial = pgEnum("type_jour_special", ['ferme', 'type_semaine', 'type_sam'])


export const parametres = pgTable("parametres", {
	cle: varchar({ length: 100 }).primaryKey().notNull(),
	valeur: varchar({ length: 255 }).notNull(),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	nom: varchar({ length: 255 }).notNull(),
	role: role().default('employe').notNull(),
	lieuParDefaut: lieu("lieu_par_defaut").default('ext').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const auditLog = pgTable("audit_log", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id"),
	action: varchar({ length: 50 }).notNull(),
	tableName: varchar("table_name", { length: 100 }).notNull(),
	ligneId: varchar("ligne_id", { length: 100 }),
	ancien: jsonb(),
	nouveau: jsonb(),
	ts: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_log_user_id_users_id_fk"
		}),
]);

export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	nom: varchar({ length: 100 }).notNull(),
	emoji: varchar({ length: 10 }),
	icone: varchar({ length: 50 }),
	ordreAffichage: integer("ordre_affichage").default(0).notNull(),
});

export const saisiesSoir = pgTable("saisies_soir", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	date: date().notNull(),
	produitId: integer("produit_id").notNull(),
	lieu: lieu().notNull(),
	quantiteRestante: integer("quantite_restante").default(0).notNull(),
	saisiePar: uuid("saisie_par"),
	saisieA: timestamp("saisie_a", { mode: 'string' }).defaultNow().notNull(),
	modifieA: timestamp("modifie_a", { mode: 'string' }).defaultNow().notNull(),
	conserveExtra: boolean("conserve_extra").default(false).notNull(),
}, (table) => [
	index("idx_saisies_date_lieu").using("btree", table.date.asc().nullsLast().op("date_ops"), table.lieu.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.produitId],
			foreignColumns: [produits.id],
			name: "saisies_soir_produit_id_produits_id_fk"
		}),
	foreignKey({
			columns: [table.saisiePar],
			foreignColumns: [users.id],
			name: "saisies_soir_saisie_par_users_id_fk"
		}),
	unique("saisies_soir_date_produit_id_lieu_unique").on(table.date, table.produitId, table.lieu),
]);

export const joursSpeciaux = pgTable("jours_speciaux", {
	date: date().primaryKey().notNull(),
	type: typeJourSpecial().notNull(),
	note: varchar({ length: 255 }),
});

export const produits = pgTable("produits", {
	id: serial().primaryKey().notNull(),
	categorieId: integer("categorie_id").notNull(),
	nom: varchar({ length: 255 }).notNull(),
	actif: boolean().default(true).notNull(),
	ordreAffichage: integer("ordre_affichage").default(0).notNull(),
	prixRevientCentimes: integer("prix_revient_centimes"),
	consommationPain: jsonb("consommation_pain"),
	couleur: varchar({ length: 20 }),
	dureeVie: integer("duree_vie").default(24).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.categorieId],
			foreignColumns: [categories.id],
			name: "produits_categorie_id_categories_id_fk"
		}),
]);

export const cibles = pgTable("cibles", {
	produitId: integer("produit_id").notNull(),
	typeJour: typeJour("type_jour").notNull(),
	lieu: lieu().notNull(),
	quantite: integer().default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.produitId],
			foreignColumns: [produits.id],
			name: "cibles_produit_id_produits_id_fk"
		}),
	primaryKey({ columns: [table.produitId, table.typeJour, table.lieu], name: "cibles_produit_id_type_jour_lieu_pk"}),
]);

export const cloturas = pgTable("cloturas", {
	date: date().notNull(),
	lieu: lieu().notNull(),
	cloturePar: uuid("cloture_par"),
	clotureA: timestamp("cloture_a", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.cloturePar],
			foreignColumns: [users.id],
			name: "cloturas_cloture_par_users_id_fk"
		}),
	primaryKey({ columns: [table.date, table.lieu], name: "cloturas_date_lieu_pk"}),
]);
