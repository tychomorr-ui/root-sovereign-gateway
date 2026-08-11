CREATE TABLE `personal_identities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`personalMemberCode` varchar(40) NOT NULL,
	`label` varchar(96) NOT NULL,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `personal_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `personal_identities_ownerUserId_unique` UNIQUE(`ownerUserId`),
	CONSTRAINT `personal_identities_personalMemberCode_unique` UNIQUE(`personalMemberCode`)
);
--> statement-breakpoint
ALTER TABLE `personal_identities` ADD CONSTRAINT `personal_identities_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;