ALTER TABLE `attestations` ADD `issuedByUserId` int;--> statement-breakpoint
ALTER TABLE `emergency_resources` ADD `sourceUrl` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `sourceUrl` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `attestations` ADD CONSTRAINT `attestations_issuedByUserId_users_id_fk` FOREIGN KEY (`issuedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;