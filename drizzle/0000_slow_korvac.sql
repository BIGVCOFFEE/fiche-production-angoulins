-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."lieu" AS ENUM('ext', 'kiosque');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'manager', 'employe');--> statement-breakpoint
CREATE TYPE "public"."type_jour" AS ENUM('sem', 'sam', 'dim');--> statement-breakpoint
CREATE TYPE "public"."type_jour_special" AS ENUM('ferme', 'type_semaine', 'type_sam');--> statement-breakpoint
CREATE TABLE "parametres" (
	"cle" varchar(100) PRIMARY KEY NOT NULL,
	"valeur" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"nom" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'employe' NOT NULL,
	"lieu_par_defaut" "lieu" DEFAULT 'ext' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"action" varchar(50) NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"ligne_id" varchar(100),
	"ancien" jsonb,
	"nouveau" jsonb,
	"ts" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" varchar(100) NOT NULL,
	"emoji" varchar(10),
	"icone" varchar(50),
	"ordre_affichage" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saisies_soir" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"produit_id" integer NOT NULL,
	"lieu" "lieu" NOT NULL,
	"quantite_restante" integer DEFAULT 0 NOT NULL,
	"saisie_par" uuid,
	"saisie_a" timestamp DEFAULT now() NOT NULL,
	"modifie_a" timestamp DEFAULT now() NOT NULL,
	"conserve_extra" boolean DEFAULT false NOT NULL,
	CONSTRAINT "saisies_soir_date_produit_id_lieu_unique" UNIQUE("date","produit_id","lieu")
);
--> statement-breakpoint
CREATE TABLE "jours_speciaux" (
	"date" date PRIMARY KEY NOT NULL,
	"type" "type_jour_special" NOT NULL,
	"note" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "produits" (
	"id" serial PRIMARY KEY NOT NULL,
	"categorie_id" integer NOT NULL,
	"nom" varchar(255) NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"ordre_affichage" integer DEFAULT 0 NOT NULL,
	"prix_revient_centimes" integer,
	"consommation_pain" jsonb,
	"couleur" varchar(20),
	"duree_vie" integer DEFAULT 24 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cibles" (
	"produit_id" integer NOT NULL,
	"type_jour" "type_jour" NOT NULL,
	"lieu" "lieu" NOT NULL,
	"quantite" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cibles_produit_id_type_jour_lieu_pk" PRIMARY KEY("produit_id","type_jour","lieu")
);
--> statement-breakpoint
CREATE TABLE "cloturas" (
	"date" date NOT NULL,
	"lieu" "lieu" NOT NULL,
	"cloture_par" uuid,
	"cloture_a" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cloturas_date_lieu_pk" PRIMARY KEY("date","lieu")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saisies_soir" ADD CONSTRAINT "saisies_soir_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saisies_soir" ADD CONSTRAINT "saisies_soir_saisie_par_users_id_fk" FOREIGN KEY ("saisie_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorie_id_categories_id_fk" FOREIGN KEY ("categorie_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cibles" ADD CONSTRAINT "cibles_produit_id_produits_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."produits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloturas" ADD CONSTRAINT "cloturas_cloture_par_users_id_fk" FOREIGN KEY ("cloture_par") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_saisies_date_lieu" ON "saisies_soir" USING btree ("date" date_ops,"lieu" enum_ops);
*/