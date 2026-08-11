CREATE TABLE `attestations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectUserId` int NOT NULL,
	`issuerLabel` varchar(140) NOT NULL,
	`issuerKind` varchar(80) NOT NULL,
	`scope` varchar(180) NOT NULL,
	`evidenceStatus` enum('not-provided','declared','verified','disputed') NOT NULL DEFAULT 'not-provided',
	`status` enum('active','revoked','expired','disputed') NOT NULL DEFAULT 'active',
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`disputeSummary` text,
	CONSTRAINT `attestations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consent_grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`recipientLabel` varchar(120) NOT NULL,
	`fieldNamesJson` text NOT NULL,
	`purpose` varchar(280) NOT NULL,
	`status` enum('active','expired','revoked') NOT NULL DEFAULT 'active',
	`receiptCode` varchar(64) NOT NULL,
	`expiresAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consent_grants_id` PRIMARY KEY(`id`),
	CONSTRAINT `consent_grants_receiptCode_unique` UNIQUE(`receiptCode`)
);
--> statement-breakpoint
CREATE TABLE `emergency_resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emergencyType` enum('safety','shelter','food','health','legal','other') NOT NULL,
	`regionLabel` varchar(160) NOT NULL,
	`resourceName` varchar(160) NOT NULL,
	`contactLabel` varchar(280) NOT NULL,
	`contactUrl` varchar(500),
	`verifiedAt` timestamp,
	`isPublished` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emergency_resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `member_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`memberCode` varchar(40) NOT NULL,
	`displayName` varchar(96),
	`verificationLevel` enum('unverified','identity-bound','attested') NOT NULL DEFAULT 'unverified',
	`privateByDefault` boolean NOT NULL DEFAULT true,
	`exportRequestedAt` timestamp,
	`deletionRequestedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_profiles_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `member_profiles_memberCode_unique` UNIQUE(`memberCode`)
);
--> statement-breakpoint
CREATE TABLE `scoped_vouches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`voucherUserId` int NOT NULL,
	`subjectUserId` int NOT NULL,
	`scope` varchar(180) NOT NULL,
	`note` varchar(500),
	`status` enum('pending','active','declined','revoked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	`revokedAt` timestamp,
	CONSTRAINT `scoped_vouches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(140) NOT NULL,
	`description` text NOT NULL,
	`serviceType` varchar(100) NOT NULL,
	`eligibilityRequirement` varchar(240) NOT NULL,
	`isPublished` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `truth_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorUserId` int NOT NULL,
	`authorLabel` varchar(96) NOT NULL,
	`claimType` enum('report','firsthand_account','opinion','analysis','correction','question') NOT NULL,
	`body` text NOT NULL,
	`sourceUrlsJson` text NOT NULL,
	`evidenceDigest` varchar(128),
	`integrityReceipt` varchar(128) NOT NULL,
	`identityBound` boolean NOT NULL DEFAULT false,
	`integrityBound` boolean NOT NULL DEFAULT false,
	`sourcesDeclared` boolean NOT NULL DEFAULT false,
	`reviewCompleted` boolean NOT NULL DEFAULT false,
	`visibility` enum('public','members','private') NOT NULL DEFAULT 'public',
	`withdrawnAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `truth_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attestations` ADD CONSTRAINT `attestations_subjectUserId_users_id_fk` FOREIGN KEY (`subjectUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consent_grants` ADD CONSTRAINT `consent_grants_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD CONSTRAINT `member_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scoped_vouches` ADD CONSTRAINT `scoped_vouches_voucherUserId_users_id_fk` FOREIGN KEY (`voucherUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scoped_vouches` ADD CONSTRAINT `scoped_vouches_subjectUserId_users_id_fk` FOREIGN KEY (`subjectUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `truth_posts` ADD CONSTRAINT `truth_posts_authorUserId_users_id_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attestations_subject_idx` ON `attestations` (`subjectUserId`);--> statement-breakpoint
CREATE INDEX `consent_grants_owner_idx` ON `consent_grants` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `emergency_resources_type_idx` ON `emergency_resources` (`emergencyType`,`isPublished`);--> statement-breakpoint
CREATE INDEX `scoped_vouches_subject_idx` ON `scoped_vouches` (`subjectUserId`);--> statement-breakpoint
CREATE INDEX `scoped_vouches_voucher_idx` ON `scoped_vouches` (`voucherUserId`);--> statement-breakpoint
CREATE INDEX `services_published_idx` ON `services` (`isPublished`);--> statement-breakpoint
CREATE INDEX `truth_posts_feed_idx` ON `truth_posts` (`visibility`,`createdAt`);--> statement-breakpoint
CREATE INDEX `truth_posts_author_idx` ON `truth_posts` (`authorUserId`);