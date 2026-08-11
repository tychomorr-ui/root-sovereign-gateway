CREATE TABLE `operator_intakes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submittedByUserId` int NOT NULL,
	`candidateMemberCode` varchar(40) NOT NULL,
	`candidateLabel` varchar(120) NOT NULL,
	`requestedRole` enum('issuer','directory_steward','incident_reviewer') NOT NULL,
	`regionalScope` varchar(160) NOT NULL,
	`conflictDisclosure` text NOT NULL,
	`status` enum('submitted','approved','declined') NOT NULL DEFAULT 'submitted',
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`decisionNote` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operator_intakes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `operator_intakes` ADD CONSTRAINT `operator_intakes_submittedByUserId_users_id_fk` FOREIGN KEY (`submittedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operator_intakes` ADD CONSTRAINT `operator_intakes_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `operator_intakes_status_idx` ON `operator_intakes` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `operator_intakes_submitter_idx` ON `operator_intakes` (`submittedByUserId`,`createdAt`);