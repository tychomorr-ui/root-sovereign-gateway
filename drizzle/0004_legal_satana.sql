ALTER TABLE `emergency_resources` ADD `reviewDueAt` timestamp;--> statement-breakpoint
ALTER TABLE `emergency_resources` ADD `publishedAt` timestamp;--> statement-breakpoint
ALTER TABLE `emergency_resources` ADD `publishedByUserId` int;--> statement-breakpoint
ALTER TABLE `services` ADD `verifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `services` ADD `reviewDueAt` timestamp;--> statement-breakpoint
ALTER TABLE `services` ADD `publishedAt` timestamp;--> statement-breakpoint
ALTER TABLE `services` ADD `publishedByUserId` int;--> statement-breakpoint
ALTER TABLE `emergency_resources` ADD CONSTRAINT `emergency_resources_publishedByUserId_users_id_fk` FOREIGN KEY (`publishedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_publishedByUserId_users_id_fk` FOREIGN KEY (`publishedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;