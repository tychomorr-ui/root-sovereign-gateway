CREATE TABLE `atmos_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`alertType` enum('receipt_expiring','receipt_expired') NOT NULL,
	`severity` enum('warning','critical') NOT NULL,
	`status` enum('open','acknowledged','resolved') NOT NULL DEFAULT 'open',
	`dedupeKey` varchar(160) NOT NULL,
	`details` varchar(500) NOT NULL,
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`acknowledgedAt` timestamp,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `atmos_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `atmos_alerts_dedupeKey_unique` UNIQUE(`dedupeKey`)
);
--> statement-breakpoint
CREATE TABLE `truth_talk_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(140) NOT NULL,
	`originUrl` varchar(500) NOT NULL,
	`feedUrl` varchar(500) NOT NULL,
	`publicKeyPem` text,
	`status` enum('pending','active','paused') NOT NULL DEFAULT 'pending',
	`scope` varchar(80) NOT NULL DEFAULT 'public-read-only',
	`lastCheckedAt` timestamp,
	`lastError` varchar(500),
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `truth_talk_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `truth_talk_connections_originUrl_unique` UNIQUE(`originUrl`)
);
--> statement-breakpoint
ALTER TABLE `atmos_audits` MODIFY COLUMN `action` enum('registered','updated','challenge.issued','receipt.recorded','receipt.rejected','alert.opened','suspended') NOT NULL;--> statement-breakpoint
ALTER TABLE `truth_talk_connections` ADD CONSTRAINT `truth_talk_connections_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `atmos_alerts_status_idx` ON `atmos_alerts` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `atmos_alerts_node_idx` ON `atmos_alerts` (`nodeId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `truth_talk_connections_status_idx` ON `truth_talk_connections` (`status`,`createdAt`);