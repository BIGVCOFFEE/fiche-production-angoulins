import { relations } from "drizzle-orm/relations";
import { users, auditLog, produits, saisiesSoir, categories, cibles, cloturas } from "./schema";

export const auditLogRelations = relations(auditLog, ({one}) => ({
	user: one(users, {
		fields: [auditLog.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	auditLogs: many(auditLog),
	saisiesSoirs: many(saisiesSoir),
	cloturas: many(cloturas),
}));

export const saisiesSoirRelations = relations(saisiesSoir, ({one}) => ({
	produit: one(produits, {
		fields: [saisiesSoir.produitId],
		references: [produits.id]
	}),
	user: one(users, {
		fields: [saisiesSoir.saisiePar],
		references: [users.id]
	}),
}));

export const produitsRelations = relations(produits, ({one, many}) => ({
	saisiesSoirs: many(saisiesSoir),
	category: one(categories, {
		fields: [produits.categorieId],
		references: [categories.id]
	}),
	cibles: many(cibles),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	produits: many(produits),
}));

export const ciblesRelations = relations(cibles, ({one}) => ({
	produit: one(produits, {
		fields: [cibles.produitId],
		references: [produits.id]
	}),
}));

export const cloturasRelations = relations(cloturas, ({one}) => ({
	user: one(users, {
		fields: [cloturas.cloturePar],
		references: [users.id]
	}),
}));