CREATE TABLE `project_reclaim_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('created','reviewed','published','unpublished','watchlisted') NOT NULL,
	`details` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_reclaim_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_reclaim_interests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`sourceId` int NOT NULL,
	`privateNote` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_reclaim_interests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_reclaim_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`pillar` enum('health','housing','work','education','community','independence') NOT NULL,
	`sourceKind` enum('resource','opportunity') NOT NULL,
	`county` enum('mendocino','lake') NOT NULL,
	`sourceUrl` varchar(500) NOT NULL,
	`availabilityNote` varchar(500) NOT NULL,
	`nodeId` int,
	`status` enum('draft','internal_watchlist','published','unpublished') NOT NULL DEFAULT 'draft',
	`verifiedAt` timestamp,
	`reviewDueAt` timestamp,
	`publishedAt` timestamp,
	`publishedByUserId` int,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_reclaim_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `project_reclaim_audits` ADD CONSTRAINT `project_reclaim_audits_sourceId_project_reclaim_sources_id_fk` FOREIGN KEY (`sourceId`) REFERENCES `project_reclaim_sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reclaim_audits` ADD CONSTRAINT `project_reclaim_audits_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reclaim_interests` ADD CONSTRAINT `project_reclaim_interests_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reclaim_interests` ADD CONSTRAINT `project_reclaim_interests_sourceId_project_reclaim_sources_id_fk` FOREIGN KEY (`sourceId`) REFERENCES `project_reclaim_sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reclaim_sources` ADD CONSTRAINT `project_reclaim_sources_publishedByUserId_users_id_fk` FOREIGN KEY (`publishedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reclaim_sources` ADD CONSTRAINT `project_reclaim_sources_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `project_reclaim_audits_source_idx` ON `project_reclaim_audits` (`sourceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `project_reclaim_interests_owner_idx` ON `project_reclaim_interests` (`ownerUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `project_reclaim_sources_status_idx` ON `project_reclaim_sources` (`status`,`county`,`pillar`);