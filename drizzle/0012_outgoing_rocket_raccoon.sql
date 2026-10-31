CREATE TABLE `archangel_receipt_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptId` varchar(160) NOT NULL,
	`receiptHash` varchar(128) NOT NULL,
	`contract` varchar(120) NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`nodeEndpoint` varchar(500) NOT NULL,
	`nodePublicKeyFingerprint` varchar(64) NOT NULL,
	`artifactSha256` varchar(80),
	`manifestCid` varchar(160),
	`nodeStatus` enum('ok','degraded','not_ready') NOT NULL,
	`boundary` varchar(160) NOT NULL,
	`canonicalPayload` text NOT NULL,
	`signature` text NOT NULL,
	`observedAt` timestamp NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`importedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `archangel_receipt_imports_id` PRIMARY KEY(`id`),
	CONSTRAINT `archangel_receipt_imports_receiptId_unique` UNIQUE(`receiptId`),
	CONSTRAINT `archangel_receipt_imports_receiptHash_unique` UNIQUE(`receiptHash`)
);
--> statement-breakpoint
ALTER TABLE `archangel_receipt_imports` ADD CONSTRAINT `archangel_receipt_imports_importedByUserId_users_id_fk` FOREIGN KEY (`importedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `archangel_receipt_imports_node_idx` ON `archangel_receipt_imports` (`nodeId`,`observedAt`);--> statement-breakpoint
CREATE INDEX `archangel_receipt_imports_expiry_idx` ON `archangel_receipt_imports` (`expiresAt`);