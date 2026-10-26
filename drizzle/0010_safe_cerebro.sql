CREATE TABLE `atmos_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`action` enum('registered','updated','challenge.issued','receipt.recorded','receipt.rejected','suspended') NOT NULL,
	`actorUserId` int,
	`receiptHash` varchar(128),
	`details` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `atmos_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `atmos_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` varchar(80) NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`nonceHash` varchar(64) NOT NULL,
	`issuedAt` timestamp NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `atmos_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `atmos_challenges_challengeId_unique` UNIQUE(`challengeId`)
);
--> statement-breakpoint
CREATE TABLE `atmos_node_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`displayName` varchar(180) NOT NULL,
	`endpointUrl` varchar(500) NOT NULL,
	`publicKeyPem` text NOT NULL,
	`publicKeyFingerprint` varchar(64) NOT NULL,
	`approvedScope` varchar(120) NOT NULL DEFAULT 'read:health',
	`verificationState` enum('pending','verified','suspended') NOT NULL DEFAULT 'pending',
	`reachability` enum('unknown','reachable') NOT NULL DEFAULT 'unknown',
	`nodeVersion` varchar(120),
	`lastReceiptHash` varchar(128),
	`lastObservedAt` timestamp,
	`lastVerifiedAt` timestamp,
	`registeredByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `atmos_node_registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `atmos_node_registrations_nodeId_unique` UNIQUE(`nodeId`)
);
--> statement-breakpoint
CREATE TABLE `atmos_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`challengeId` varchar(80) NOT NULL,
	`receiptHash` varchar(128) NOT NULL,
	`canonicalPayload` text NOT NULL,
	`signature` text NOT NULL,
	`nodeVersion` varchar(120) NOT NULL,
	`nodeStatus` enum('ok','degraded','not_ready') NOT NULL,
	`capabilitiesJson` text NOT NULL,
	`observedAt` timestamp NOT NULL,
	`verifiedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `atmos_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `atmos_receipts_challengeId_unique` UNIQUE(`challengeId`),
	CONSTRAINT `atmos_receipts_receiptHash_unique` UNIQUE(`receiptHash`)
);
--> statement-breakpoint
ALTER TABLE `atmos_audits` ADD CONSTRAINT `atmos_audits_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `atmos_node_registrations` ADD CONSTRAINT `atmos_node_registrations_registeredByUserId_users_id_fk` FOREIGN KEY (`registeredByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `atmos_audits_node_idx` ON `atmos_audits` (`nodeId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `atmos_challenges_node_idx` ON `atmos_challenges` (`nodeId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `atmos_node_registrations_verification_idx` ON `atmos_node_registrations` (`verificationState`,`nodeId`);--> statement-breakpoint
CREATE INDEX `atmos_receipts_node_idx` ON `atmos_receipts` (`nodeId`,`verifiedAt`);