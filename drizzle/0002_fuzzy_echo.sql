CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`listing_id` text,
	`titre` text NOT NULL,
	`prix_unitaire` integer NOT NULL,
	`quantite` real NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`acheteur_id` text NOT NULL,
	`agriculteur_id` text NOT NULL,
	`statut` text DEFAULT 'en_attente_paiement' NOT NULL,
	`total` integer NOT NULL,
	`mode_livraison` text NOT NULL,
	`adresse_livraison` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`acheteur_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agriculteur_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payment_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`from_statut` text,
	`to_statut` text NOT NULL,
	`acteur` text NOT NULL,
	`montant` integer,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`montant` integer NOT NULL,
	`frais_commission` integer NOT NULL,
	`statut_sequestre` text DEFAULT 'en_attente' NOT NULL,
	`ref_agregateur` text NOT NULL,
	`methode` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_order_id_unique` ON `payments` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_ref_agregateur_unique` ON `payments` (`ref_agregateur`);