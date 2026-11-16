CREATE TABLE `truth_talk_handoffs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`jti` varchar(64) NOT NULL,
	`version` varchar(64) NOT NULL,
	`audience` varchar(64) NOT NULL,
	`scopeJson` text NOT NULL,
	`subject` varchar(96) NOT NULL,
	`displayName` varchar(96),
	`issuedAt` timestamp NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `truth_talk_handoffs_id` PRIMARY KEY(`id`),
	CONSTRAINT `truth_talk_handoffs_jti_unique` UNIQUE(`jti`)
);
--> statement-breakpoint
ALTER TABLE `truth_talk_handoffs` ADD CONSTRAINT `truth_talk_handoffs_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `truth_talk_handoffs_owner_idx` ON `truth_talk_handoffs` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `truth_talk_handoffs_expiry_idx` ON `truth_talk_handoffs` (`expiresAt`);