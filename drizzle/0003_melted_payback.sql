CREATE TABLE `operator_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operatorId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('approved','role_updated','suspended','reactivated','reviewed') NOT NULL,
	`details` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operator_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`operatorLabel` varchar(120) NOT NULL,
	`governanceRole` enum('first_executive','issuer','directory_steward','incident_reviewer') NOT NULL,
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`approvedByUserId` int NOT NULL,
	`approvedAt` timestamp NOT NULL DEFAULT (now()),
	`conflictDisclosureConfirmed` boolean NOT NULL DEFAULT false,
	`reviewDueAt` timestamp,
	`suspendedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operators_id` PRIMARY KEY(`id`),
	CONSTRAINT `operators_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `operator_audits` ADD CONSTRAINT `operator_audits_operatorId_operators_id_fk` FOREIGN KEY (`operatorId`) REFERENCES `operators`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operator_audits` ADD CONSTRAINT `operator_audits_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operators` ADD CONSTRAINT `operators_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operators` ADD CONSTRAINT `operators_approvedByUserId_users_id_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `operator_audits_operator_idx` ON `operator_audits` (`operatorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `operators_active_role_idx` ON `operators` (`status`,`governanceRole`);