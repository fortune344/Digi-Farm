CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`agriculteur_id` text NOT NULL,
	`titre` text NOT NULL,
	`categorie` text NOT NULL,
	`description` text NOT NULL,
	`photos` text DEFAULT '[]' NOT NULL,
	`prix` integer NOT NULL,
	`unite` text NOT NULL,
	`quantite_dispo` real NOT NULL,
	`region` text NOT NULL,
	`statut` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`agriculteur_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
